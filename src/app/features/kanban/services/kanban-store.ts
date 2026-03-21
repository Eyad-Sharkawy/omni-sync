import { computed, effect, inject, Injectable, signal } from "@angular/core";
import { Board } from "../../../core/models/board";
import { Storage } from "../../../core/services/storage";

@Injectable()
export class KanbanStore {
  private readonly storage = inject(Storage);
  private _boards = signal<Board[]>(this.storage.getBoards());

  constructor() {
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

  readonly boards = this._boards.asReadonly();
  currentBoard = computed(() => this.boards()[0]);
}
