import { inject, Injectable } from "@angular/core";
import {
  arrayRemove,
  collection,
  deleteDoc,
  doc,
  Firestore,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "@angular/fire/firestore";

import { LOCAL_STORAGE } from "../../tokens/local-storage";
import { Board } from "../../models/board";
import { nanoid } from "nanoid";
import { Column } from "../../models/column";
import { Task } from "../../models/task";

type FirestoreBoard = Omit<Board, "startDate" | "dueDate"> & { startDate: string; dueDate: string };
type FirestoreTask = Omit<Task, "startDate" | "dueDate"> & { startDate: string; dueDate: string };

@Injectable({
  providedIn: "root",
})
export class Storage {
  private readonly localStorage = inject(LOCAL_STORAGE);
  private readonly firestore = inject(Firestore);
  private readonly BOARDS_KEY = "omni-sync.boards";
  private readonly KANBAN_COLLECTION = "kanban";
  private readonly BOARD_WORKSPACES_COLLECTION = "boardWorkspaces";
  private readonly USER_BOARDS_KEY_PREFIX = "omni-sync.boards.user";

  private createInitialBoards(options: { persist: boolean } = { persist: true }): {
    boards: Board[];
    columns: Column[];
    tasks: Task[];
  } {
    const initialBoards: Board[] = [
      {
        id: nanoid(),
        publicId: nanoid(12),
        name: "Initial board",
        columnsIds: [],
        startDate: new Date("2025-02-05"),
        dueDate: new Date("2026-04-01"),
      },
    ];

    const initialBoardColumns: Column[] = [];

    if (options.persist) {
      this.setKanban(initialBoards, initialBoardColumns, []);
    }

    return { boards: initialBoards, columns: initialBoardColumns, tasks: [] };
  }

  getKanban(): { boards: Board[]; columns: Column[]; tasks: Task[] } {
    const raw = this.localStorage.getItem(this.BOARDS_KEY);

    if (!raw) {
      const initialBoard = this.createInitialBoards();
      return {
        boards: initialBoard.boards,
        columns: initialBoard.columns,
        tasks: initialBoard.tasks,
      };
    }

    try {
      const {
        boards: parsedBoards,
        columns: parsedColumns,
        tasks: parsedTasks,
      } = JSON.parse(raw) as {
        boards: Board[];
        columns: Column[];
        tasks: Task[];
      };

      const boards: Board[] = parsedBoards.map((board) => ({
        ...board,
        startDate: new Date(board.startDate),
        dueDate: new Date(board.dueDate),
      }));

      const columns: Column[] = parsedColumns;

      const tasks: Task[] = parsedTasks.map((task) => ({
        ...task,
        startDate: new Date(task.startDate),
        dueDate: new Date(task.dueDate),
      }));

      return { boards, columns, tasks };
    } catch (error) {
      console.warn(
        `[Storage] Failed to parse boards from localStorage key "${this.BOARDS_KEY}". Returning in-memory initial boards without overwriting stored value. ${error}`,
      );

      return this.createInitialBoards({ persist: false });
    }
  }

  setKanban(boards: Board[], columns: Column[], tasks: Task[]) {
    this.localStorage.setItem(
      this.BOARDS_KEY,
      JSON.stringify({ boards: boards, columns: columns, tasks: tasks }),
    );
  }

  async getKanbanForUser(userId: string): Promise<{ boards: Board[]; columns: Column[]; tasks: Task[] }> {
    try {
      const snapshot = await getDoc(doc(this.firestore, this.KANBAN_COLLECTION, userId));
      let hydrated: { boards: Board[]; columns: Column[]; tasks: Task[] };

      if (!snapshot.exists()) {
        // First-time users still need shared workspaces merged on initial load.
        const initial = this.createInitialBoards({ persist: false });
        await this.setKanbanForUser(userId, initial.boards, initial.columns, initial.tasks);
        hydrated = initial;
      } else {
        const data = snapshot.data() as {
          boards?: Board[];
          columns?: Column[];
          tasks?: Task[];
        };
        hydrated = this.hydrateKanban(data.boards ?? [], data.columns ?? [], data.tasks ?? []);
      }

      try {
        const shared = await this.fetchSharedWorkspacesForMember(userId);
        hydrated = this.mergeKanbanStates(hydrated, shared);
      } catch (e) {
        console.warn("[Storage] Failed to load shared workspaces.", e);
      }

      this.setUserKanbanCache(userId, hydrated.boards, hydrated.columns, hydrated.tasks);
      return hydrated;
    } catch (error) {
      console.warn("[Storage] Firestore read failed, using local cache for signed-in user.", error);

      const cached = this.getUserKanbanCache(userId);
      if (cached) {
        return cached;
      }

      const initial = this.createInitialBoards({ persist: false });
      this.setUserKanbanCache(userId, initial.boards, initial.columns, initial.tasks);
      return initial;
    }
  }

  async setKanbanForUser(
    userId: string,
    boards: Board[],
    columns: Column[],
    tasks: Task[],
  ): Promise<void> {
    this.setUserKanbanCache(userId, boards, columns, tasks);

    const personalBoards = boards.filter((b) => !b.sharedFromOwnerId);
    const personalBoardIds = new Set(personalBoards.map((b) => b.id));
    const personalColumns = columns.filter((c) => personalBoardIds.has(c.boardId));
    const personalColumnIds = new Set(personalColumns.map((c) => c.id));
    const personalTasks = tasks.filter((t) => personalColumnIds.has(t.columnId));

    const personalSerialized = this.serializeKanbanForFirestore(
      personalBoards,
      personalColumns,
      personalTasks,
    );

    try {
      await setDoc(doc(this.firestore, this.KANBAN_COLLECTION, userId), {
        boards: personalSerialized.boards,
        columns: personalSerialized.columns,
        tasks: personalSerialized.tasks,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.warn("[Storage] Firestore write failed, kept local cache for signed-in user.", error);
    }

    try {
      for (const board of personalBoards) {
        if (board.memberIds && board.memberIds.length > 0) {
          await this.upsertBoardWorkspaceDocument(userId, board, columns, tasks);
        } else {
          // The owner's personal `kanban/{uid}` doc can omit `memberIds` on boards (older
          // saves, schema drift). If we delete the workspace whenever local `memberIds` is
          // empty, we wipe shared collaboration for everyone. If we upsert with `[]`, members
          // lose access and their writes stop persisting to Firestore.
          const wsRef = doc(this.firestore, this.BOARD_WORKSPACES_COLLECTION, board.id);
          const wsSnap = await getDoc(wsRef);
          if (!wsSnap.exists()) {
            continue;
          }
          const wsData = wsSnap.data() as { memberIds?: string[] };
          const remoteMembers = Array.isArray(wsData.memberIds) ? wsData.memberIds : [];
          if (remoteMembers.length > 0) {
            await this.upsertBoardWorkspaceDocument(
              userId,
              { ...board, memberIds: remoteMembers },
              columns,
              tasks,
            );
          } else {
            await this.deleteBoardWorkspace(board.id);
          }
        }
      }

      const sharedBoards = boards.filter((b) => b.sharedFromOwnerId);
      for (const board of sharedBoards) {
        const ownerId = board.sharedFromOwnerId;
        if (ownerId) {
          await this.upsertBoardWorkspaceDocument(ownerId, board, columns, tasks);
        }
      }
    } catch (error) {
      console.warn("[Storage] Board workspace sync failed.", error);
    }
  }

  async deleteBoardWorkspace(boardId: string): Promise<void> {
    try {
      await deleteDoc(doc(this.firestore, this.BOARD_WORKSPACES_COLLECTION, boardId));
    } catch {
      /* ignore */
    }
  }

  /** Remove the current user from a shared workspace (collaborator leaves the board). */
  async removeSelfFromBoardWorkspace(boardId: string, memberUid: string): Promise<void> {
    await updateDoc(doc(this.firestore, this.BOARD_WORKSPACES_COLLECTION, boardId), {
      memberIds: arrayRemove(memberUid),
    });
  }

  /** Force-create/update one board workspace immediately (used by explicit share action). */
  async ensureBoardWorkspace(
    ownerUid: string,
    board: Board,
    columns: Column[],
    tasks: Task[],
  ): Promise<void> {
    await this.upsertBoardWorkspaceDocument(ownerUid, board, columns, tasks);
  }

  clearBoards(): void {
    this.localStorage.removeItem(this.BOARDS_KEY);
  }

  private hydrateKanban(
    parsedBoards: Board[],
    parsedColumns: Column[],
    parsedTasks: Task[],
  ): { boards: Board[]; columns: Column[]; tasks: Task[] } {
    const boards: Board[] = parsedBoards.map((board) => ({
      ...board,
      startDate: this.parseStoredDate(board.startDate),
      dueDate: this.parseStoredDate(board.dueDate),
    }));

    const columns: Column[] = parsedColumns;

    const tasks: Task[] = parsedTasks.map((task) => ({
      ...task,
      startDate: this.parseStoredDate(task.startDate),
      dueDate: this.parseStoredDate(task.dueDate),
    }));

    return { boards, columns, tasks };
  }

  private getUserKanbanCache(userId: string): { boards: Board[]; columns: Column[]; tasks: Task[] } | null {
    const raw = this.localStorage.getItem(this.getUserBoardsKey(userId));
    if (!raw) {
      return null;
    }

    try {
      const data = JSON.parse(raw) as {
        boards?: Board[];
        columns?: Column[];
        tasks?: Task[];
      };
      return this.hydrateKanban(data.boards ?? [], data.columns ?? [], data.tasks ?? []);
    } catch {
      return null;
    }
  }

  private setUserKanbanCache(userId: string, boards: Board[], columns: Column[], tasks: Task[]): void {
    this.localStorage.setItem(this.getUserBoardsKey(userId), JSON.stringify({ boards, columns, tasks }));
  }

  private getUserBoardsKey(userId: string): string {
    return `${this.USER_BOARDS_KEY_PREFIX}.${userId}`;
  }

  /**
   * Parse a `boardWorkspaces/{boardId}` document into normalized models.
   * Use `sharedFromOwnerId` when loading another user’s board for a member; use `existingBoard`
   * when merging a snapshot so collaborator metadata is preserved.
   */
  parseBoardWorkspaceDocument(
    raw: Record<string, unknown>,
    options: { sharedFromOwnerId?: string; existingBoard?: Board } = {},
  ): { board: Board; columns: Column[]; tasks: Task[] } | null {
    const data = raw as {
      memberIds?: string[];
      board?: Board;
      columns?: Column[];
      tasks?: Task[];
    };

    if (!data.board) {
      return null;
    }

    const hydratedBoard: Board = {
      ...data.board,
      startDate: this.parseStoredDate(data.board.startDate),
      dueDate: this.parseStoredDate(data.board.dueDate),
      memberIds: Array.isArray(data.memberIds) ? data.memberIds : [],
    };

    const forcedShared = options.sharedFromOwnerId;
    const existingShared = options.existingBoard?.sharedFromOwnerId;
    if (forcedShared) {
      hydratedBoard.sharedFromOwnerId = forcedShared;
    } else if (existingShared) {
      hydratedBoard.sharedFromOwnerId = existingShared;
    } else {
      delete hydratedBoard.sharedFromOwnerId;
    }

    const columns = [...(data.columns ?? [])];
    const tasks = (data.tasks ?? []).map((task) => ({
      ...task,
      startDate: this.parseStoredDate(task.startDate),
      dueDate: this.parseStoredDate(task.dueDate),
    }));

    return { board: hydratedBoard, columns, tasks };
  }

  private async fetchSharedWorkspacesForMember(
    memberUserId: string,
  ): Promise<{ boards: Board[]; columns: Column[]; tasks: Task[] }> {
    const q = query(
      collection(this.firestore, this.BOARD_WORKSPACES_COLLECTION),
      where("memberIds", "array-contains", memberUserId),
    );
    const snapshot = await getDocs(q);
    const boards: Board[] = [];
    const columns: Column[] = [];
    const tasks: Task[] = [];

    for (const d of snapshot.docs) {
      const raw = d.data() as Record<string, unknown>;
      const ownerId = typeof raw["ownerId"] === "string" ? (raw["ownerId"] as string) : "";
      if (!ownerId) {
        continue;
      }

      const slice = this.parseBoardWorkspaceDocument(raw, { sharedFromOwnerId: ownerId });
      if (!slice) {
        continue;
      }

      boards.push(slice.board);
      columns.push(...slice.columns);
      tasks.push(...slice.tasks);
    }

    return { boards, columns, tasks };
  }

  private mergeKanbanStates(
    a: { boards: Board[]; columns: Column[]; tasks: Task[] },
    b: { boards: Board[]; columns: Column[]; tasks: Task[] },
  ): { boards: Board[]; columns: Column[]; tasks: Task[] } {
    return {
      boards: [...a.boards, ...b.boards],
      columns: [...a.columns, ...b.columns],
      tasks: [...a.tasks, ...b.tasks],
    };
  }

  private async upsertBoardWorkspaceDocument(
    workspaceOwnerId: string,
    board: Board,
    allColumns: Column[],
    allTasks: Task[],
  ): Promise<void> {
    let effectiveBoard = board;
    if (!(board.memberIds && board.memberIds.length > 0)) {
      try {
        const existingSnap = await getDoc(doc(this.firestore, this.BOARD_WORKSPACES_COLLECTION, board.id));
        if (existingSnap.exists()) {
          const existing = existingSnap.data() as { memberIds?: string[] };
          if (Array.isArray(existing.memberIds) && existing.memberIds.length > 0) {
            effectiveBoard = { ...board, memberIds: existing.memberIds };
          }
        }
      } catch {
        /* keep board as-is */
      }
    }

    const persistBoard: Board = { ...effectiveBoard };
    delete persistBoard.sharedFromOwnerId;

    const sliceCols = allColumns.filter((c) => c.boardId === board.id);
    const colIds = new Set(sliceCols.map((c) => c.id));
    const sliceTasks = allTasks.filter((t) => colIds.has(t.columnId));

    const serialized = this.serializeKanbanForFirestore([persistBoard], sliceCols, sliceTasks);

    await setDoc(doc(this.firestore, this.BOARD_WORKSPACES_COLLECTION, board.id), {
      ownerId: workspaceOwnerId,
      memberIds: effectiveBoard.memberIds ?? [],
      board: serialized.boards[0],
      columns: serialized.columns,
      tasks: serialized.tasks,
      updatedAt: serverTimestamp(),
    });
  }

  private parseStoredDate(value: unknown): Date {
    if (value instanceof Date) {
      return value;
    }

    if (typeof value === "string" || typeof value === "number") {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    }

    if (
      typeof value === "object" &&
      value !== null &&
      "toDate" in value &&
      typeof (value as { toDate: unknown }).toDate === "function"
    ) {
      return (value as { toDate: () => Date }).toDate();
    }

    return new Date();
  }

  private serializeKanbanForFirestore(
    boards: Board[],
    columns: Column[],
    tasks: Task[],
  ): { boards: FirestoreBoard[]; columns: Column[]; tasks: FirestoreTask[] } {
    return {
      boards: boards.map((board) => ({
        ...board,
        startDate: board.startDate.toISOString(),
        dueDate: board.dueDate.toISOString(),
      })),
      columns,
      tasks: tasks.map((task) => ({
        ...task,
        startDate: task.startDate.toISOString(),
        dueDate: task.dueDate.toISOString(),
      })),
    };
  }
}
