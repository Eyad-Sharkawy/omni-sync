import {inject, Injectable} from '@angular/core';
import {LOCAL_STORAGE} from '../tokens/local-storage';
import {Board} from '../models/board';

@Injectable({
  providedIn: 'root',
})
export class Storage {
  private readonly localStorage = inject(LOCAL_STORAGE);
  private readonly BOARDS_KEY = "omni-sync.boards";

  getBoards(): Board[] {
    const raw = this.localStorage.getItem(this.BOARDS_KEY);

    if (!raw) {
      return [];
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
    }
    catch {
      return [];
    }
  }

  setBoards(boards: Board[]) {
    this.localStorage.setItem(this.BOARDS_KEY, JSON.stringify(boards));
  }

  clearBoards(): void {
    this.localStorage.removeItem(this.BOARDS_KEY);
  }
}
