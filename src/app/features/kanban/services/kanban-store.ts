import { computed, effect, inject, Injectable, signal } from "@angular/core";

import { Board } from "../../../core/models/board";
import { Storage } from "../../../core/services/storage";
import { Column } from "../../../core/models/column";
import { Task } from "../../../core/models/task";
import { OmniSyncColors } from "../../../shared/UI/colors";
import { LOCAL_STORAGE } from "../../../core/tokens/local-storage";
import { nanoid } from "nanoid";

type KanbanState = ReturnType<Storage["getKanban"]>;

export interface CreateTaskInput {
  title: string;
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

@Injectable({
  providedIn: "root",
})
export class KanbanStore {
  private readonly storage = inject(Storage);
  private readonly localStorage = inject(LOCAL_STORAGE);
  private readonly CURRENT_BOARD_KEY = "omni-sync.currentBoardId";

  private readonly _kanban = signal<KanbanState>(this.storage.getKanban());

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
    //Persist to LocalStorage only when board state actually changes.
    let isFirstRun = true;
    let lastSerialized = JSON.stringify(this._kanban());

    effect(() => {
      const kanban = this._kanban();

      if (isFirstRun) {
        isFirstRun = false;
        return;
      }

      const nextSerialized = JSON.stringify(kanban);

      if (nextSerialized === lastSerialized) {
        return;
      }

      lastSerialized = nextSerialized;

      this.storage.setKanban(kanban.boards, kanban.columns, kanban.tasks);
    });

    // Persist and validate board selection so we can restore it after reloads.
    effect(() => {
      const selectedId = this._currentBoardId();
      const boards = this.boards();

      if (!this.canUseLocalStorage()) {
        return;
      }

      if (selectedId && !boards.some((board) => board.id === selectedId)) {
        this._currentBoardId.set(this.boards()[0].id);
        return;
      }

      if (!selectedId) {
        this.localStorage.removeItem(this.CURRENT_BOARD_KEY);
        return;
      }

      this.localStorage.setItem(this.CURRENT_BOARD_KEY, selectedId);
    });
  }

  setCurrentBoard(boardId: string): void {
    this._currentBoardId.set(boardId);
  }

  private getStoredCurrentBoardId(): string {
    if (!this.canUseLocalStorage()) {
      return this.boards()[0].id;
    }

    const currentBoardId = this.localStorage.getItem(this.CURRENT_BOARD_KEY);

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

      const safeFromIndex = Math.max(0, Math.min(fromIndex, sourceIds.length - 1));
      const movedTaskId = sourceIds[safeFromIndex];

      if (!movedTaskId || movedTaskId !== taskId) {
        return state;
      }

      sourceIds.splice(safeFromIndex, 1);
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
