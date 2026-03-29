import { computed, effect, inject, Injectable, signal } from "@angular/core";

import { Board } from "../../../core/models/board";
import { Storage } from "../../../core/services/storage";
import { Column } from "../../../core/models/column";
import { Task } from "../../../core/models/task";
import { generateId } from "../../../shared/functions/generate-id";
import { OmniSyncColors } from "../../../shared/UI/colors";

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

@Injectable()
export class KanbanStore {
  private readonly storage = inject(Storage);

  private readonly _boards = signal<Board[]>(this.storage.getBoards());
  readonly boards = this._boards.asReadonly();

  private readonly _currentBoardId = signal<string | null>(null);

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

  readonly columns = computed(() => this.currentBoard().columns ?? []);

  constructor() {
    //Persist to LocalStorage only when board state actually changes.
    let isFirstRun = true;
    let lastSerialized = JSON.stringify(this._boards());

    effect(() => {
      const boards = this._boards();

      if (isFirstRun) {
        isFirstRun = false;
        return;
      }

      const nextSerialized = JSON.stringify(boards);

      if (nextSerialized === lastSerialized) {
        return;
      }

      lastSerialized = nextSerialized;

      this.storage.setBoards(boards);
    });
  }

  setCurrentBoard(boardId: string): void {
    this._currentBoardId.set(boardId);
  }

  getColumnById(columnId: string): Column | undefined {
    return this.columns().find((column) => column.id === columnId);
  }

  getBoardById(boardId: string): Board | undefined {
    return this.boards().find((board) => board.id === boardId);
  }

  addColumn(columnInput: CreateColumnInput) {
    const board = this.currentBoard();

    if (!board) {
      return;
    }

    const column: Column = {
      id: generateId(),
      header: columnInput.header,
      color: columnInput.color,
      tasks: [],
    };

    this.patchCurrentBoard((current) => ({
      ...current,
      columns: [...current.columns, column],
    }));
  }

  updateColumn(columnId: string, patch: UpdateColumnInput): void {
    this.patchCurrentBoard((current) => ({
      ...current,
      columns: current.columns.map((column) =>
        column.id === columnId ? { ...column, ...patch } : column,
      ),
    }));
  }

  addTask(columnId: string, taskInput: CreateTaskInput): void {
    const board = this.currentBoard();

    if (!board) {
      return;
    }

    const task: Task = {
      id: generateId(),
      title: taskInput.title,
      priority: taskInput.priority,
      tags: taskInput.tags ?? [],
      startDate: taskInput.startDate,
      dueDate: taskInput.dueDate,
    };

    this.patchCurrentBoard((current) => ({
      ...current,
      columns: current.columns.map((column) =>
        column.id === columnId ? { ...column, tasks: [...column.tasks, task] } : column,
      ),
    }));
  }

  updateTask(columnId: string, taskId: string, patch: Partial<Omit<Task, "id">>): void {
    this.patchCurrentBoard((current) => ({
      ...current,
      columns: current.columns.map((column) => {
        if (column.id !== columnId) {
          return column;
        }

        return {
          ...column,
          tasks: column.tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task)),
        };
      }),
    }));
  }

  removeTask(columnId: string, taskId: string): void {
    this.patchCurrentBoard((current) => ({
      ...current,
      columns: current.columns.map((column) =>
        column.id === columnId
          ? { ...column, tasks: column.tasks.filter((task) => task.id !== taskId) }
          : column,
      ),
    }));
  }

  moveTask(
    taskId: string,
    fromColumnId: string,
    toColumnId: string,
    fromIndex: number,
    toIndex: number,
  ): void {
    this.patchCurrentBoard((current) => {
      const sourceColumn = current.columns.find((column) => column.id === fromColumnId);
      const targetColumn = current.columns.find((column) => column.id === toColumnId);

      if (!sourceColumn || !targetColumn) {
        return current;
      }

      const sourceTasks = [...sourceColumn.tasks];
      const safeFromIndex = Math.max(0, Math.min(fromIndex, sourceTasks.length - 1));
      const movedTask = sourceTasks[safeFromIndex];

      if (!movedTask || movedTask.id !== taskId) {
        return current;
      }

      sourceTasks.splice(safeFromIndex, 1);

      if (fromColumnId === toColumnId) {
        const safeToIndex = Math.max(0, Math.min(toIndex, sourceTasks.length));
        sourceTasks.splice(safeToIndex, 0, movedTask);

        return {
          ...current,
          columns: current.columns.map((column) =>
            column.id === fromColumnId ? { ...column, tasks: sourceTasks } : column,
          ),
        };
      }

      const targetTasks = [...targetColumn.tasks];
      const safeToIndex = Math.max(0, Math.min(toIndex, targetTasks.length));
      targetTasks.splice(safeToIndex, 0, movedTask);

      return {
        ...current,
        columns: current.columns.map((column) => {
          if (column.id === fromColumnId) {
            return { ...column, tasks: sourceTasks };
          }

          if (column.id === toColumnId) {
            return { ...column, tasks: targetTasks };
          }

          return column;
        }),
      };
    });
  }

  moveColumn(fromIndex: number, toIndex: number): void {
    this.patchCurrentBoard((current) => {
      const columns = [...current.columns];
      const safeFromIndex = Math.max(0, Math.min(fromIndex, columns.length - 1));
      const movedColumn = columns[safeFromIndex];
      const safeToIndex = Math.max(0, Math.min(toIndex, columns.length - 1));

      if (!movedColumn) {
        return current;
      }

      columns.splice(safeFromIndex, 1);
      columns.splice(safeToIndex, 0, movedColumn);

      return { ...current, columns };
    });
  }

  removeColumn(columnId: string): void {
    this.patchCurrentBoard((current) => ({
      ...current,
      columns: current.columns.filter((column) => column.id !== columnId),
    }));
  }

  addBoard(boardInput: CreateBoardInput): string {
    const boardId = generateId();

    this._boards.update((boards) => [
      ...boards,
      {
        id: boardId,
        name: boardInput.name,
        startDate: boardInput.startDate,
        dueDate: boardInput.dueDate,
        columns: [],
      },
    ]);

    return boardId;
  }

  updateBoard(boardId: string, patch: UpdateBoardInput): void {
    this._boards.update((boards) =>
      boards.map((board) => (board.id === boardId ? { ...board, ...patch } : board)),
    );
  }

  removeBoard(boardId: string): void {
    this._boards.update((boards) => boards.filter((board) => board.id !== boardId));
  }

  moveBoard(fromIndex: number, toIndex: number): void {
    this._boards.update((boards) => {
      if (boards.length <= 1) {
        return boards;
      }

      const nextBoards = [...boards];
      const safeFromIndex = Math.max(0, Math.min(fromIndex, nextBoards.length - 1));
      const safeToIndex = Math.max(0, Math.min(toIndex, nextBoards.length - 1));
      const movedBoard = nextBoards[safeFromIndex];

      if (!movedBoard || safeFromIndex === safeToIndex) {
        return boards;
      }

      nextBoards.splice(safeFromIndex, 1);
      nextBoards.splice(safeToIndex, 0, movedBoard);

      return nextBoards;
    });
  }

  private patchCurrentBoard(updater: (board: Board) => Board): void {
    const current = this.currentBoard();

    if (!current) {
      return;
    }

    this._boards.update((boards) =>
      boards.map((board) => (board.id === current.id ? updater(board) : board)),
    );
  }
}
