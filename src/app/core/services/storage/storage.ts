import { inject, Injectable } from "@angular/core";
import { Firestore, doc, getDoc, setDoc } from "@angular/fire/firestore";

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

    const initialBoardColumns: Column[] = [
      {
        id: nanoid(),
        header: "To do",
        color: "indigo",
        boardId: initialBoards[0].id,
        tasksIds: [],
      },
      {
        id: nanoid(),
        header: "In progress",
        color: "amber",
        boardId: initialBoards[0].id,
        tasksIds: [],
      },
      {
        id: "in-review",
        header: "In Review",
        color: "sky",
        boardId: initialBoards[0].id,
        tasksIds: [],
      },
      {
        id: nanoid(),
        header: "Done",
        color: "mint",
        boardId: initialBoards[0].id,
        tasksIds: [],
      },
    ];

    initialBoards[0].columnsIds = initialBoardColumns
      .filter((column) => column.boardId === initialBoards[0].id)
      .map((column) => column.id);

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

      if (!snapshot.exists()) {
        const initial = this.createInitialBoards({ persist: false });
        await this.setKanbanForUser(userId, initial.boards, initial.columns, initial.tasks);
        return initial;
      }

      const data = snapshot.data() as {
        boards?: Board[];
        columns?: Column[];
        tasks?: Task[];
      };

      const hydrated = this.hydrateKanban(data.boards ?? [], data.columns ?? [], data.tasks ?? []);
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
    const serialized = this.serializeKanbanForFirestore(boards, columns, tasks);
    try {
      await setDoc(doc(this.firestore, this.KANBAN_COLLECTION, userId), {
        boards: serialized.boards,
        columns: serialized.columns,
        tasks: serialized.tasks,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.warn("[Storage] Firestore write failed, kept local cache for signed-in user.", error);
    }
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
