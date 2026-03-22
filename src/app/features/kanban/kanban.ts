import { Component, inject, signal } from "@angular/core";
import { DatePipe } from "@angular/common";

import { TaskCard } from "../../shared/components/task-card/task-card";
import { TasksColumn } from "../../shared/components/tasks-column/tasks-column";
import { TaskTag } from "../../shared/components/task-tag/task-tag";
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
  addTaskModalInfo = signal<{ columnId?: string; taskId?: string }>({});

  openModal(taskInfo: { columnId: string; taskId?: string }) {
    if (this.addTaskModalInfo().columnId !== taskInfo.columnId) {
      const column = this.kanbanStore.getColumnById(taskInfo.columnId);

      if (column) {
        if (taskInfo.taskId) {
          const task = column.tasks.find((task) => task.id === taskInfo.taskId);

          if (task) {
            this.addTaskModalInfo.set(taskInfo);
          }
        } else {
          this.addTaskModalInfo.update((value) => ({
            ...value,
            columnId: taskInfo.columnId,
          }));
        }
      }
    }

    this.showModal.set(true);
  }

  closeModal() {
    this.addTaskModalInfo.set({});

    this.showModal.set(false);
  }

  onDeleteTask(columnId: string, taskId: string) {
    this.kanbanStore.removeTask(columnId, taskId);
  }
}
