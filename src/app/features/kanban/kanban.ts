import { Component, inject, signal } from "@angular/core";
import { DatePipe } from "@angular/common";

import { TaskCard } from "../../shared/components/task-card/task-card";
import { TasksColumn } from "../../shared/components/tasks-column/tasks-column";
import { TaskTag } from "../../shared/components/task-tag/task-tag.component";
import { KanbanStore } from "./services/kanban-store";
import { AddTaskModal } from "../../shared/components/add-task-modal/add-task-modal";

@Component({
  selector: "os-kanban",
  imports: [TaskCard, TasksColumn, TaskTag, DatePipe, AddTaskModal],
  templateUrl: "./kanban.html",
  styleUrl: "./kanban.css",
})
export class Kanban {
  private readonly kanbanStore = inject(KanbanStore);

  board = this.kanbanStore.currentBoard;
  columns = this.kanbanStore.columns;
  showModal = signal(false);
  selectedColumnId = signal(this.columns()[0].id);

  openModal(columnId: string) {
    if (this.selectedColumnId() !== columnId) {
      const column = this.kanbanStore.getColumnById(columnId);

      if (column) {
        this.selectedColumnId.set(column.id);
      }
    }

    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }
}
