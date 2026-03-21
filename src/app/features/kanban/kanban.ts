import {Component, computed, effect, ElementRef, inject, signal, viewChild} from '@angular/core';
import {DatePipe} from '@angular/common';

import {TaskCard} from "../../shared/components/task-card/task-card";
import {TasksColumn} from "../../shared/components/tasks-column/tasks-column";
import {TaskMetaTag} from '../../shared/components/task-meta-tag/task-meta-tag';
import {KanbanStore} from './services/kanban-store';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'os-kanban',
  imports: [
    TaskCard,
    TasksColumn,
    TaskMetaTag,
    DatePipe,
    FormsModule
  ],
  templateUrl: './kanban.html',
  styleUrl: './kanban.css',
})
export class Kanban {
  private readonly kanbanStore = inject(KanbanStore);
  private readonly dialogRef = viewChild<ElementRef<HTMLDialogElement> | undefined>("addTaskModal");

  currentBoard = this.kanbanStore.currentBoard;
  boardName = computed(() => this.currentBoard().name);
  boardStartDate = computed(() => this.currentBoard().startDate);
  boardDueDate = computed(() => this.currentBoard().dueDate);
  showModal = signal(false);
  selectedColumnId = signal("");

  constructor() {
    effect(() => {
      const dialogRef = this.dialogRef();
      const shouldOpen = this.showModal();

      if (!dialogRef) return;

      const dialog = dialogRef.nativeElement;

      if (shouldOpen && !dialog.open) {
        dialog.showModal();
      }

      if (!shouldOpen && dialog.open) {
        dialog.close();
      }
    });
  }

  openModal(columnId: string) {
    if (this.selectedColumnId() !== columnId) {
      this.selectedColumnId.set(columnId);
    }

    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  closeOnBackdrop(event: MouseEvent, dialog: HTMLDialogElement): void {
    if (event.target === dialog) {
      dialog.close();
    }
  }
}
