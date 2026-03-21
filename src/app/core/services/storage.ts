import {inject, Injectable} from '@angular/core';
import {LOCAL_STORAGE} from '../tokens/local-storage';
import {Board} from '../models/board';

@Injectable({
  providedIn: 'root',
})
export class Storage {
  private readonly localStorage = inject(LOCAL_STORAGE);
  private readonly BOARDS_KEY = "omni-sync.boards";

  private createInitialBoards(options: { persist: boolean } = {persist: true}): Board[] {
    const initialBoards: Board[] = [
      {
        id: "board-product-ops-q1-2026",
        name: "Product Ops Board",
        columns: [
          {
            id: "todo",
            header: "To do",
            color: "indigo",
            tasks: []
          },
          {
            id: "in-progress",
            header: "In progress",
            color: "amber",
            tasks: []
          },
          {
            id: "in-review",
            header: "In Review",
            color: "sky",
            tasks: []
          },
          {
            id: "done",
            header: "Done",
            color: "mint",
            tasks: []
          },
        ],
        startDate: new Date("2025-02-05"),
        dueDate: new Date("2026-04-01")

      }
    ];

    if (options.persist) {
      this.setBoards(initialBoards);
    }

    return initialBoards;

  }

  getBoards(): Board[] {
    const raw = this.localStorage.getItem(this.BOARDS_KEY);

    if (!raw) {
      return this.createInitialBoards();
    }

    try {
      const parsed = JSON.parse(raw) as Board[];

      return parsed.map((board) => ({
        ...board,
        startDate: new Date(board.startDate),
        dueDate: new Date(board.dueDate),
        columns: board.columns.map((column) => ({
          ...column,
          tasks: column.tasks.map((task) => ({
            ...task,
            startDate: new Date(task.startDate),
            dueDate: new Date(task.dueDate),
          })),
        })),
      }));
    } catch(error) {
      console.warn(
        `[Storage] Failed to parse boards from localStorage key "${this.BOARDS_KEY}". Returning in-memory initial boards without overwriting stored value. ${error}`
      );

      return this.createInitialBoards({persist: false});
    }
  }

  setBoards(boards: Board[]) {
    this.localStorage.setItem(this.BOARDS_KEY, JSON.stringify(boards));
  }

  clearBoards(): void {
    this.localStorage.removeItem(this.BOARDS_KEY);
  }
}
