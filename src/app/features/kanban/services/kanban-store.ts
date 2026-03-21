import { computed, effect, inject, Injectable, signal } from "@angular/core";
import { Board } from "../../../core/models/board";
import { Storage } from "../../../core/services/storage";
import { Column } from "../../../core/models/column";
import { Task } from "../../../core/models/task";

export interface CreateTaskInput {
  message: string;
  priority: Task["priority"];
  startDate: Date;
  dueDate: Date;
  metaTags?: Task["tags"];
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
      if (isFirstRun) {
        isFirstRun = false;
        return;
      }

      const boards = this._boards();
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

  addTask(columnId: string, taskInput: CreateTaskInput): void {
    const board = this.currentBoard();

    if (!board) {
      return;
    }

    const task: Task = {
      id: crypto.randomUUID(),
      title: taskInput.message,
      priority: taskInput.priority,
      tags: taskInput.metaTags ?? [],
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

  moveTask(taskId: string, fromColumnId: string, toColumnId: string) {
    if (fromColumnId === toColumnId) {
      return;
    }

    this.patchCurrentBoard((current) => {
      let movedTask: Task | undefined;

      const columnsWithoutTask = current.columns.map((column) => {
        if (column.id !== fromColumnId) {
          return column;
        }

        const nextTasks = column.tasks.filter((task) => {
          const keep = task.id !== taskId;

          if (!keep) {
            movedTask = task;
          }

          return keep;
        });

        return { ...column, tasks: nextTasks };
      });

      if (!movedTask) {
        return current;
      }

      return {
        ...current,
        columns: columnsWithoutTask.map((column) =>
          column.id === toColumnId ? { ...column, tasks: [...column.tasks, movedTask!] } : column,
        ),
      };
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
