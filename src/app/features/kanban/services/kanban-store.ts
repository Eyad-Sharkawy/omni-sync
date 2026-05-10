import { computed, effect, inject, Injectable, signal, untracked } from "@angular/core";
import { doc, Firestore, onSnapshot } from "@angular/fire/firestore";

import { Board } from "../../../core/models/board";
import { Storage } from "../../../core/services/storage/storage";
import { Column } from "../../../core/models/column";
import { Task } from "../../../core/models/task";
import { OmniSyncColors } from "../../../shared/UI/colors";
import { LOCAL_STORAGE } from "../../../core/tokens/local-storage";
import { nanoid } from "nanoid";
import { Auth } from "../../../core/services/auth/auth";
import { UserProfileService } from "../../../core/services/user-profile/user-profile";

type KanbanState = ReturnType<Storage["getKanban"]>;

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority: Task["priority"];
  startDate: Date;
  dueDate: Date;
  tags?: Task["tags"];
}

export interface CreateColumnInput {
  header: string;
  color: OmniSyncColors;
}

export interface UpdateColumnInput {
  header?: string;
  color?: OmniSyncColors;
}

export interface CreateBoardInput {
  name: string;
  startDate: Date;
  dueDate: Date;
}

export interface UpdateBoardInput {
  name?: string;
  startDate?: Date;
  dueDate?: Date;
}

const BOARD_WORKSPACES_COLLECTION = "boardWorkspaces";

@Injectable()
export class KanbanStore {
  private readonly storage = inject(Storage);
  private readonly firestore = inject(Firestore);
  private readonly localStorage = inject(LOCAL_STORAGE);
  private readonly auth = inject(Auth);
  private readonly userProfile = inject(UserProfileService);
  private readonly CURRENT_BOARD_KEY = "omni-sync.currentBoardId";
  private readonly GUEST_SCOPE = "guest";

  private readonly _kanban = signal<KanbanState>(this.storage.getKanban());
  private readonly isHydrating = signal(false);
  private readonly isApplyingRemoteSnapshot = signal(false);
  private readonly pendingWorkspaceWriteCounts = new Map<string, number>();
  private readonly lastAppliedWorkspaceUpdatedAtMs = new Map<string, number>();
  private readonly lastRemoteWorkspaceFingerprints = new Map<string, string>();
  private readonly FIRESTORE_SYNC_DEBOUNCE_MS = 800;
  private readonly WORKSPACE_SYNC_DEBOUNCE_MS = 300;
  private firestoreSyncTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private workspaceSyncTimeoutId: ReturnType<typeof setTimeout> | null = null;

  readonly boards = computed(() => this._kanban().boards);
  readonly columns = computed(() => this._kanban().columns);
  readonly tasks = computed(() => this._kanban().tasks);

  private readonly _currentBoardId = signal<string>(this.getStoredCurrentBoardId());

  currentBoard = computed(() => {
    const boards = this.boards();
    const selectedId = this._currentBoardId();

    if (selectedId) {
      const found = boards.find((board) => board.id === selectedId);

      if (found) {
        return found;
      }
    }

    return boards[0];
  });

  readonly currentColumns = computed(() => {
    const board = this.currentBoard();

    if (!board) return [];
    const byId = new Map(this.columns().map((c) => [c.id, c]));
    return board.columnsIds.map((id) => byId.get(id)).filter((c): c is Column => !!c);
  });

  readonly currentTasks = computed(() => {
    const columns = this.currentColumns();

    if (!columns) return [];

    const byId = new Map(this.tasks().map((task) => [task.id, task]));

    return columns.flatMap((column) =>
      column.tasksIds.map((id) => byId.get(id)).filter((task): task is Task => !!task),
    );
  });

  constructor() {
    effect(() => {
      void this.hydrateKanbanByAuthState();
    });

    //Persist to LocalStorage only when board state actually changes.
    let isFirstRun = true;
    let lastSerialized = JSON.stringify(this._kanban());

    effect(() => {
      const kanban = this._kanban();
      const currentUser = this.auth.currentUser();

      if (isFirstRun) {
        isFirstRun = false;
        return;
      }

      if (this.isHydrating()) {
        return;
      }
      if (this.isApplyingRemoteSnapshot()) {
        return;
      }

      const nextSerialized = JSON.stringify(kanban);

      if (nextSerialized === lastSerialized) {
        return;
      }

      lastSerialized = nextSerialized;

      if (currentUser) {
        const collaborativeBoard = this.getCurrentBoardInState(kanban);
        if (collaborativeBoard) {
          const currentFingerprint = this.workspaceFingerprintFromState(kanban, collaborativeBoard.id);
          const lastRemoteFingerprint = this.lastRemoteWorkspaceFingerprints.get(collaborativeBoard.id);
          if (currentFingerprint && currentFingerprint === lastRemoteFingerprint) {
            return;
          }
          if (this.firestoreSyncTimeoutId) {
            clearTimeout(this.firestoreSyncTimeoutId);
            this.firestoreSyncTimeoutId = null;
          }
          const workspaceOwnerUid = collaborativeBoard.sharedFromOwnerId ?? currentUser.uid;
          this.scheduleWorkspaceSync(workspaceOwnerUid, collaborativeBoard.id, kanban);
          return;
        }
        this.scheduleFirestoreSync(currentUser.uid, kanban);
        return;
      }

      this.storage.setKanban(kanban.boards, kanban.columns, kanban.tasks);
    });

    // Persist and validate board selection so we can restore it after reloads.
    effect(() => {
      const selectedId = this._currentBoardId();
      const boards = this.boards();
      const key = this.getCurrentBoardStorageKey();

      if (!this.canUseLocalStorage()) {
        return;
      }

      if (selectedId && !boards.some((board) => board.id === selectedId)) {
        this._currentBoardId.set(this.boards()[0].id);
        return;
      }

      if (!selectedId) {
        this.localStorage.removeItem(key);
        return;
      }

      this.localStorage.setItem(key, selectedId);
    });

    /** Live-merge shared workspace docs so all collaborators’ tasks/columns stay in sync. */
    effect((onCleanup) => {
      const user = this.auth.currentUser();
      const boardId = this._currentBoardId();
      if (!user) {
        return;
      }
      if (!boardId) {
        return;
      }

      // Read board meta untracked so local task/column mutations do not recreate the listener
      // and immediately overwrite optimistic edits with the last remote snapshot.
      const board = untracked(() => this._kanban().boards.find((b) => b.id === boardId));
      if (!board) {
        return;
      }
      const collaborative =
        Boolean(board.sharedFromOwnerId) || (board.memberIds?.length ?? 0) > 0;
      if (!collaborative) {
        return;
      }

      const ref = doc(this.firestore, BOARD_WORKSPACES_COLLECTION, boardId);
      const unsub = onSnapshot(
        ref,
        (snap) => {
          if (!snap.exists()) {
            return;
          }
          if (this.isHydrating()) {
            return;
          }
          if (this.isWorkspaceWritePending(boardId)) {
            return;
          }
          const data = snap.data() ?? {};
          const updatedAt = this.parseUpdatedAtMs(data["updatedAt"]);
          const lastAppliedAt = this.lastAppliedWorkspaceUpdatedAtMs.get(boardId) ?? 0;
          if (Number.isFinite(updatedAt)) {
            if (updatedAt < lastAppliedAt) {
              return;
            }
            this.lastAppliedWorkspaceUpdatedAtMs.set(boardId, updatedAt);
          }
          const ownerId = typeof data["ownerId"] === "string" ? (data["ownerId"] as string) : "";
          const existingBoard = this._kanban().boards.find((b) => b.id === boardId);
          const sharedFromOwnerId =
            ownerId && ownerId !== user.uid ? ownerId : undefined;

          const parsed = this.storage.parseBoardWorkspaceDocument(data, {
            existingBoard: existingBoard,
            sharedFromOwnerId,
          });
          if (!parsed) {
            return;
          }
          const remoteFingerprint = this.workspaceFingerprintFromParsed(parsed, boardId);
          this.lastRemoteWorkspaceFingerprints.set(boardId, remoteFingerprint);
          this.mergeRemoteWorkspaceSlice(boardId, parsed);
        },
        (err) => {
          console.warn("[KanbanStore] board workspace listener:", err);
        },
      );

      onCleanup(() => unsub());
    });
  }

  setCurrentBoard(boardId: string): void {
    this._currentBoardId.set(boardId);
  }

  private getStoredCurrentBoardId(): string {
    if (!this.canUseLocalStorage()) {
      return this.boards()[0].id;
    }

    const currentBoardId = this.localStorage.getItem(this.getCurrentBoardStorageKey());

    return currentBoardId && currentBoardId.trim().length > 0
      ? currentBoardId
      : this.boards()[0].id;
  }

  private canUseLocalStorage(): boolean {
    return (
      typeof this.localStorage?.getItem === "function" &&
      typeof this.localStorage?.setItem === "function" &&
      typeof this.localStorage?.removeItem === "function"
    );
  }

  private async hydrateKanbanByAuthState(): Promise<void> {
    const user = this.auth.currentUser();
    this.isHydrating.set(true);
    try {
      const kanban = user ? await this.storage.getKanbanForUser(user.uid) : this.storage.getKanban();
      this._kanban.set(kanban);

      const storedBoardId = this.getStoredCurrentBoardId();
      const fallbackBoardId = kanban.boards[0]?.id ?? "";
      const nextBoardId =
        storedBoardId && kanban.boards.some((board) => board.id === storedBoardId)
          ? storedBoardId
          : fallbackBoardId;

      this._currentBoardId.set(nextBoardId);
    } finally {
      this.isHydrating.set(false);
    }
  }

  private getCurrentBoardStorageKey(): string {
    const userId = this.auth.currentUser()?.uid ?? this.GUEST_SCOPE;
    return `${this.CURRENT_BOARD_KEY}.${userId}`;
  }

  private getCurrentBoardInState(kanban: KanbanState): Board | null {
    const selectedId = this._currentBoardId();
    const board = kanban.boards.find((b) => b.id === selectedId) ?? kanban.boards[0];
    if (!board) {
      return null;
    }
    return Boolean(board.sharedFromOwnerId) || (board.memberIds?.length ?? 0) > 0 ? board : null;
  }

  private markWorkspaceWriteStart(boardId: string): void {
    const prev = this.pendingWorkspaceWriteCounts.get(boardId) ?? 0;
    this.pendingWorkspaceWriteCounts.set(boardId, prev + 1);
  }

  private markWorkspaceWriteEnd(boardId: string): void {
    const prev = this.pendingWorkspaceWriteCounts.get(boardId) ?? 0;
    if (prev <= 1) {
      this.pendingWorkspaceWriteCounts.delete(boardId);
      return;
    }
    this.pendingWorkspaceWriteCounts.set(boardId, prev - 1);
  }

  private isWorkspaceWritePending(boardId: string): boolean {
    return (this.pendingWorkspaceWriteCounts.get(boardId) ?? 0) > 0;
  }

  private parseUpdatedAtMs(raw: unknown): number {
    if (typeof raw === "string") {
      return Date.parse(raw);
    }
    if (typeof raw === "number") {
      return raw;
    }
    if (raw && typeof raw === "object" && "toDate" in raw && typeof (raw as { toDate: unknown }).toDate === "function") {
      return (raw as { toDate: () => Date }).toDate().getTime();
    }
    return NaN;
  }

  /** Replace one board’s columns/tasks from a remote `boardWorkspaces` snapshot. */
  private mergeRemoteWorkspaceSlice(
    boardId: string,
    parsed: { board: Board; columns: Column[]; tasks: Task[] },
  ): void {
    this.isApplyingRemoteSnapshot.set(true);
    try {
      this._kanban.update((state) => {
        const boardOut: Board = { ...parsed.board, id: boardId };

        const oldColumnIds = new Set(
          state.columns.filter((c) => c.boardId === boardId).map((c) => c.id),
        );

        return {
          ...state,
          boards: state.boards.map((b) => (b.id === boardId ? boardOut : b)),
          columns: [...state.columns.filter((c) => c.boardId !== boardId), ...parsed.columns],
          tasks: [
            ...state.tasks.filter((t) => !oldColumnIds.has(t.columnId)),
            ...parsed.tasks,
          ],
        };
      });
    } finally {
      this.isApplyingRemoteSnapshot.set(false);
    }
  }

  private scheduleFirestoreSync(userId: string, kanban: KanbanState): void {
    if (this.firestoreSyncTimeoutId) {
      clearTimeout(this.firestoreSyncTimeoutId);
    }

    const snapshot: KanbanState = {
      boards: [...kanban.boards],
      columns: [...kanban.columns],
      tasks: [...kanban.tasks],
    };

    this.firestoreSyncTimeoutId = setTimeout(() => {
      this.firestoreSyncTimeoutId = null;
      void this.storage.setKanbanForUser(userId, snapshot.boards, snapshot.columns, snapshot.tasks);
    }, this.FIRESTORE_SYNC_DEBOUNCE_MS);
  }

  private scheduleWorkspaceSync(ownerUid: string, boardId: string, kanban: KanbanState): void {
    if (this.workspaceSyncTimeoutId) {
      clearTimeout(this.workspaceSyncTimeoutId);
    }

    const snapshot: KanbanState = {
      boards: [...kanban.boards],
      columns: [...kanban.columns],
      tasks: [...kanban.tasks],
    };

    this.workspaceSyncTimeoutId = setTimeout(() => {
      this.workspaceSyncTimeoutId = null;
      const board = snapshot.boards.find((b) => b.id === boardId);
      if (!board) {
        return;
      }

      this.markWorkspaceWriteStart(boardId);
      void this.storage
        .ensureBoardWorkspace(ownerUid, board, snapshot.columns, snapshot.tasks)
        .finally(() => this.markWorkspaceWriteEnd(boardId));
    }, this.WORKSPACE_SYNC_DEBOUNCE_MS);
  }

  private workspaceFingerprintFromState(kanban: KanbanState, boardId: string): string {
    const board = kanban.boards.find((b) => b.id === boardId);
    if (!board) {
      return "";
    }
    const columns = kanban.columns.filter((c) => c.boardId === boardId);
    const columnIds = new Set(columns.map((c) => c.id));
    const tasks = kanban.tasks.filter((t) => columnIds.has(t.columnId));
    return JSON.stringify({
      board: {
        id: board.id,
        name: board.name,
        columnsIds: board.columnsIds,
        startDate: board.startDate?.toISOString?.() ?? board.startDate,
        dueDate: board.dueDate?.toISOString?.() ?? board.dueDate,
      },
      columns: columns.map((c) => ({
        id: c.id,
        boardId: c.boardId,
        header: c.header,
        color: c.color,
        tasksIds: c.tasksIds,
      })),
      tasks: tasks.map((t) => ({
        id: t.id,
        columnId: t.columnId,
        title: t.title,
        description: t.description,
        priority: t.priority,
        tags: t.tags,
        startDate: t.startDate?.toISOString?.() ?? t.startDate,
        dueDate: t.dueDate?.toISOString?.() ?? t.dueDate,
      })),
    });
  }

  private workspaceFingerprintFromParsed(
    parsed: { board: Board; columns: Column[]; tasks: Task[] },
    boardId: string,
  ): string {
    return JSON.stringify({
      board: {
        id: boardId,
        name: parsed.board.name,
        columnsIds: parsed.board.columnsIds,
        startDate: parsed.board.startDate?.toISOString?.() ?? parsed.board.startDate,
        dueDate: parsed.board.dueDate?.toISOString?.() ?? parsed.board.dueDate,
      },
      columns: parsed.columns.map((c) => ({
        id: c.id,
        boardId: c.boardId,
        header: c.header,
        color: c.color,
        tasksIds: c.tasksIds,
      })),
      tasks: parsed.tasks.map((t) => ({
        id: t.id,
        columnId: t.columnId,
        title: t.title,
        description: t.description,
        priority: t.priority,
        tags: t.tags,
        startDate: t.startDate?.toISOString?.() ?? t.startDate,
        dueDate: t.dueDate?.toISOString?.() ?? t.dueDate,
      })),
    });
  }

  getColumnById(columnId: string): Column | undefined {
    return this.columns().find((column) => column.id === columnId);
  }

  getBoardById(boardId: string): Board | undefined {
    return this.boards().find((board) => board.id === boardId);
  }

  getBoardByPublicId(boardPublicId: string): Board | undefined {
    return this.boards().find((board) => board.publicId === boardPublicId);
  }

  addColumnToBoard(columnInput: CreateColumnInput): string {
    const currentBoard = this.currentBoard();

    if (!currentBoard) {
      return "";
    }

    const columnId = nanoid();

    const column: Column = {
      id: columnId,
      header: columnInput.header,
      color: columnInput.color,
      boardId: currentBoard.id,
      tasksIds: [],
    };

    this.updateKanban((state) => ({
      ...state,
      boards: state.boards.map((board) =>
        board.id === currentBoard.id
          ? {
              ...board,
              columnsIds: [...board.columnsIds, columnId],
            }
          : board,
      ),
      columns: [...state.columns, column],
    }));

    return columnId;
  }

  updateColumn(columnId: string, patch: UpdateColumnInput): void {
    this.patchColumnById(columnId, patch);
  }

  addTaskToColumn(columnId: string, taskInput: CreateTaskInput): string {
    const board = this.currentBoard();

    if (!board) {
      return "";
    }

    const taskId = nanoid();

    const task: Task = {
      id: taskId,
      title: taskInput.title,
      description: taskInput.description,
      priority: taskInput.priority,
      columnId: columnId,
      tags: taskInput.tags ?? [],
      startDate: taskInput.startDate,
      dueDate: taskInput.dueDate,
    };

    this.updateKanban((state) => ({
      ...state,
      columns: state.columns.map((column) =>
        column.id === columnId
          ? {
              ...column,
              tasksIds: [...column.tasksIds, taskId],
            }
          : column,
      ),
      tasks: [...state.tasks, task],
    }));

    return taskId;
  }

  updateTask(taskId: string, patch: Partial<Omit<Task, "id">>): void {
    this.patchTaskById(taskId, patch);
  }

  removeTask(taskId: string): void {
    this.updateKanban((state) => ({
      ...state,
      tasks: state.tasks.filter((task) => task.id !== taskId),
      columns: state.columns.map((column) => ({
        ...column,
        tasksIds: column.tasksIds.filter((id) => id !== taskId),
      })),
    }));
  }

  moveTask(
    taskId: string,
    fromColumnId: string,
    toColumnId: string,
    fromIndex: number,
    toIndex: number,
  ): void {
    this.updateKanban((state) => {
      const sourceColumn = state.columns.find((column) => column.id === fromColumnId);
      const targetColumn = state.columns.find((column) => column.id === toColumnId);

      if (!sourceColumn || !targetColumn) {
        return state;
      }

      const sourceIds = [...sourceColumn.tasksIds];
      const taskIndexInSource = sourceIds.indexOf(taskId);
      if (taskIndexInSource < 0) {
        return state;
      }

      sourceIds.splice(taskIndexInSource, 1);
      if (fromColumnId === toColumnId) {
        const safeToIndex = Math.max(0, Math.min(toIndex, sourceIds.length));
        sourceIds.splice(safeToIndex, 0, taskId);
        return {
          ...state,
          columns: state.columns.map((column) =>
            column.id === fromColumnId ? { ...column, tasksIds: sourceIds } : column,
          ),
        };
      }

      const targetIds = [...targetColumn.tasksIds];
      const safeToIndex = Math.max(0, Math.min(toIndex, targetIds.length));
      targetIds.splice(safeToIndex, 0, taskId);
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === taskId ? { ...task, columnId: toColumnId } : task,
        ),
        columns: state.columns.map((column) => {
          if (column.id === fromColumnId) {
            return { ...column, tasksIds: sourceIds };
          }
          if (column.id === toColumnId) {
            return { ...column, tasksIds: targetIds };
          }
          return column;
        }),
      };
    });
  }

  moveColumn(fromIndex: number, toIndex: number): void {
    const currentBoardId = this._currentBoardId();

    this.updateKanban((state) => {
      const board = state.boards.find((b) => b.id === currentBoardId);

      if (!board) {
        return state;
      }

      const nextIds = [...board.columnsIds];
      const safeFromIndex = Math.max(0, Math.min(fromIndex, nextIds.length - 1));
      const safeToIndex = Math.max(0, Math.min(toIndex, nextIds.length - 1));

      if (safeFromIndex === safeToIndex || !nextIds[safeFromIndex]) {
        return state;
      }

      const [movedId] = nextIds.splice(safeFromIndex, 1);
      nextIds.splice(safeToIndex, 0, movedId);

      return {
        ...state,
        boards: state.boards.map((b) =>
          b.id === currentBoardId ? { ...b, columnsIds: nextIds } : b,
        ),
      };
    });
  }

  removeColumn(columnId: string): void {
    this.updateKanban((state) => ({
      ...state,
      boards: state.boards.map((board) => ({
        ...board,
        columnsIds: board.columnsIds.filter((id) => id !== columnId),
      })),
      columns: state.columns.filter((column) => column.id !== columnId),
      tasks: state.tasks.filter((task) => task.columnId !== columnId),
    }));
  }

  addBoard(boardInput: CreateBoardInput): string {
    const boardId = nanoid();
    const publicId = nanoid(12);

    const board = {
      id: boardId,
      publicId: publicId,
      name: boardInput.name,
      startDate: boardInput.startDate,
      dueDate: boardInput.dueDate,
      columnsIds: [],
    };

    this.updateKanban((state) => ({
      ...state,
      boards: [...state.boards, board],
    }));

    return boardId;
  }

  updateBoard(boardId: string, patch: UpdateBoardInput): void {
    this.patchBoardById(boardId, patch);
  }

  removeBoard(boardId: string): void {
    const board = this.getBoardById(boardId);
    if (board?.sharedFromOwnerId) {
      return;
    }

    void this.storage.deleteBoardWorkspace(boardId);

    this.updateKanban((state) => {
      const removedColumnIds = new Set(
        state.columns.filter((column) => column.boardId === boardId).map((column) => column.id),
      );

      return {
        ...state,
        boards: state.boards.filter((board) => board.id !== boardId),
        columns: state.columns.filter((column) => column.boardId !== boardId),
        tasks: state.tasks.filter((task) => !removedColumnIds.has(task.columnId)),
      };
    });
  }

  /**
   * Collaborator stops seeing a board shared with them (removes self from workspace `memberIds`).
   */
  async leaveSharedBoard(
    boardId: string,
  ): Promise<{ ok: true } | { ok: false; message: string }> {
    const user = this.auth.currentUser();
    if (!user) {
      return { ok: false, message: "Sign in to leave a shared board." };
    }

    const board = this.getBoardById(boardId);
    if (!board?.sharedFromOwnerId) {
      return { ok: false, message: "That board is not shared with you." };
    }

    try {
      await this.storage.removeSelfFromBoardWorkspace(boardId, user.uid);
    } catch (error) {
      console.warn("[KanbanStore] leaveSharedBoard Firestore update failed.", error);
      return { ok: false, message: "Could not leave the board. Try again." };
    }

    const wasCurrent = this._currentBoardId() === boardId;

    this.updateKanban((state) => {
      const removedColumnIds = new Set(
        state.columns.filter((column) => column.boardId === boardId).map((column) => column.id),
      );

      return {
        ...state,
        boards: state.boards.filter((b) => b.id !== boardId),
        columns: state.columns.filter((column) => column.boardId !== boardId),
        tasks: state.tasks.filter((task) => !removedColumnIds.has(task.columnId)),
      };
    });

    if (wasCurrent) {
      const nextId = this.boards()[0]?.id ?? "";
      this._currentBoardId.set(nextId);
    }

    return { ok: true };
  }

  /**
   * Owner shares a personal board with another user (resolved by unique username).
   */
  async shareBoardWithUsername(
    boardId: string,
    username: string,
  ): Promise<{ ok: true } | { ok: false; message: string }> {
    const current = this.auth.currentUser();
    if (!current) {
      return { ok: false, message: "Sign in to share boards." };
    }

    const targetUid = await this.userProfile.getUidForUsername(username);
    if (!targetUid) {
      return { ok: false, message: "No user found with that username." };
    }

    if (targetUid === current.uid) {
      return { ok: false, message: "You cannot share a board with yourself." };
    }

    const board = this.getBoardById(boardId);
    if (!board) {
      return { ok: false, message: "Board not found." };
    }

    const nextMembers = [...(board.memberIds ?? [])];
    if (nextMembers.includes(targetUid)) {
      return { ok: false, message: "This board is already shared with that user." };
    }

    nextMembers.push(targetUid);
    this.patchBoardById(boardId, { memberIds: nextMembers });

    // Ensure shared workspace exists immediately (don't rely only on debounced sync).
    const updatedBoard = this.getBoardById(boardId);
    if (!updatedBoard) {
      return { ok: false, message: "Board not found after share update." };
    }
    try {
      await this.storage.ensureBoardWorkspace(
        current.uid,
        updatedBoard,
        this.columns(),
        this.tasks(),
      );
    } catch (error) {
      console.warn("[KanbanStore] shareBoardWithUsername workspace write failed.", error);
      return { ok: false, message: "Share saved locally, but Firestore rejected workspace write." };
    }

    return { ok: true };
  }

  /**
   * Owner removes a collaborator from a personal board.
   */
  removeBoardMember(
    boardId: string,
    memberUid: string,
  ): { ok: true } | { ok: false; message: string } {
    const current = this.auth.currentUser();
    if (!current) {
      return { ok: false, message: "Sign in to manage sharing." };
    }

    const board = this.getBoardById(boardId);
    if (!board) {
      return { ok: false, message: "Board not found." };
    }

    const prev = board.memberIds ?? [];
    if (!prev.includes(memberUid)) {
      return { ok: false, message: "That user is not on this board." };
    }

    this.patchBoardById(boardId, {
      memberIds: prev.filter((id) => id !== memberUid),
    });
    return { ok: true };
  }

  moveBoard(fromIndex: number, toIndex: number): void {
    this.updateKanban((state) => {
      const boards = state.boards;

      if (boards.length <= 1) {
        return state;
      }

      const nextBoards = [...boards];
      const safeFromIndex = Math.max(0, Math.min(fromIndex, nextBoards.length - 1));
      const safeToIndex = Math.max(0, Math.min(toIndex, nextBoards.length - 1));
      const movedBoard = nextBoards[safeFromIndex];

      if (!movedBoard || safeFromIndex === safeToIndex) {
        return state;
      }

      nextBoards.splice(safeFromIndex, 1);
      nextBoards.splice(safeToIndex, 0, movedBoard);

      return {
        ...state,
        boards: nextBoards,
      };
    });
  }

  getTasksByColumnId(columnId: string): Task[] {
    const column = this.columns().find((c) => c.id === columnId);
    if (!column) return [];

    const tasksMap = new Map(this.tasks().map((task) => [task.id, task]));

    return column.tasksIds
      .map((taskId) => tasksMap.get(taskId))
      .filter((task): task is Task => !!task);
  }

  hasTaskInColumn(columnId: string, taskId: string): boolean {
    return this.getTasksByColumnId(columnId).some((task) => task.id === taskId);
  }

  private updateKanban(updater: (kanban: KanbanState) => KanbanState): void {
    this._kanban.update((state) => updater(state));
  }

  private patchBoardById(boardId: string, patch: Partial<Omit<Board, "id" | "publicId">>): void {
    this.updateKanban((state) => ({
      ...state,
      boards: state.boards.map((board) => (board.id === boardId ? { ...board, ...patch } : board)),
    }));
  }

  private patchColumnById(columnId: string, patch: Partial<Omit<Column, "id" | "boardId">>): void {
    this.updateKanban((state) => ({
      ...state,
      columns: state.columns.map((column) =>
        column.id === columnId ? { ...column, ...patch } : column,
      ),
    }));
  }

  private patchTaskById(taskId: string, patch: Partial<Omit<Task, "id" | "columnId">>): void {
    this.updateKanban((state) => ({
      ...state,
      tasks: state.tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task)),
    }));
  }
}
