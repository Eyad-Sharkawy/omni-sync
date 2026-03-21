import { Component, computed, inject, signal } from "@angular/core";
import { DatePipe } from "@angular/common";

import { TaskCard } from "../../shared/components/task-card/task-card";
import { TasksColumn } from "../../shared/components/tasks-column/tasks-column";
import { TaskMetaTag } from "../../shared/components/task-meta-tag/task-meta-tag";
import { KanbanStore } from "./services/kanban-store";
import { FormsModule } from "@angular/forms";
import { AddTaskModal } from "../../shared/components/add-task-modal/add-task-modal";

@Component({
  selector: "os-kanban",
  imports: [TaskCard, TasksColumn, TaskMetaTag, DatePipe, FormsModule, AddTaskModal],
  templateUrl: "./kanban.html",
  styleUrl: "./kanban.css",
})
export class Kanban {
  private readonly kanbanStore = inject(KanbanStore);

  currentBoard = this.kanbanStore.currentBoard;
  boardName = computed(() => this.currentBoard().name);
  boardStartDate = computed(() => this.currentBoard().startDate);
  boardDueDate = computed(() => this.currentBoard().dueDate);
  showModal = signal(false);
  selectedColumnId = signal("");

  openModal(columnId: string) {
    if (this.selectedColumnId() !== columnId) {
      this.selectedColumnId.set(columnId);
    }

    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }
}
