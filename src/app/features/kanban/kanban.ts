import { Component, computed, effect, inject, signal } from "@angular/core";
import { DatePipe } from "@angular/common";

import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from "@angular/cdk/drag-drop";

import { TaskCard } from "../../shared/components/task-card/task-card";
import { TasksColumn } from "../../shared/components/tasks-column/tasks-column";
import { TaskTag } from "../../shared/components/task-tag/task-tag";
import { KanbanStore } from "./services/kanban-store";
import { Modal } from "../../shared/components/modal/modal";
import { Column } from "../../core/models/column";
import { Task } from "../../core/models/task";
import { AddTaskForm } from "./components/add-task-form/add-task-form";
import { OmniSyncColors } from "../../shared/UI/colors";
import { AddColumnForm } from "./components/add-column-form/add-column-form";

interface ModalTaskInfo {
  columnId: string;
  taskId?: string;
}

type ModalType = "addTask" | "addColumn";

@Component({
  selector: "os-kanban",
  imports: [
    TaskCard,
    TasksColumn,
    TaskTag,
    DatePipe,
    Modal,
    AddTaskForm,
    CdkDrag,
    CdkDropList,
    CdkDropListGroup,
    AddColumnForm,
  ],
  templateUrl: "./kanban.html",
  styleUrl: "./kanban.css",
})
export class Kanban {
  private readonly kanbanStore = inject(KanbanStore);

  selectedModal = signal<ModalType | null>(null);

  board = this.kanbanStore.currentBoard;
  columns = this.kanbanStore.columns;
  addTaskModalInfo = signal<ModalTaskInfo | null>(null);
  addColumnModalInfo = signal<ModalTaskInfo | null>(null);
  modalColumn = computed(() => {
    const modalInfo = this.addTaskModalInfo() ?? this.addColumnModalInfo();
    if (!modalInfo) {
      return null;
    }

    return this.kanbanStore.getColumnById(modalInfo.columnId) ?? null;
  });

  modalBadge = computed(() => this.modalColumn()?.header ?? "");
  modalColor = signal<OmniSyncColors>("zinc");
  // modalColor = computed<OmniSyncColors>(() => this.modalColumn()?.color ?? "zinc");

  constructor() {
    effect(() => {
      this.modalColor.set(this.modalColumn()?.color ?? "zinc");
    });
  }

  onAddColumn() {
    this.addColumnModalInfo.set(null);
    this.openModal();
  }

  onEditColumn(columnId: string) {
    this.addColumnModalInfo.set({ columnId: columnId });
    this.openModal();
  }

  onAddTask(taskInfo: ModalTaskInfo) {
    this.openModal(taskInfo);
  }

  onEditTask(taskInfo: ModalTaskInfo) {
    this.openModal(taskInfo);
  }

  closeModal() {
    this.addTaskModalInfo.set(null);
    this.addColumnModalInfo.set(null);
    this.selectedModal.set(null);
  }

  onModalColumnChanged(columnId: string): void {
    this.addTaskModalInfo.update((value) => (value ? { ...value, columnId } : value));
  }

  onDeleteTask(columnId: string, taskId: string) {
    this.kanbanStore.removeTask(columnId, taskId);
  }

  onDeleteColumn(columnId: string) {
    this.kanbanStore.removeColumn(columnId);
  }

  onDragStarted(): void {
    document.body.classList.add("is-dragging");
  }

  onDragEnded(): void {
    document.body.classList.remove("is-dragging");
  }

  isColumnDrop = (drag: CdkDrag<Column | Task>) => {
    const data = drag.data as Partial<Column> | undefined;
    return !!data?.id && "header" in data;
  };

  isTaskDrop = (drag: CdkDrag<Column | Task>) => {
    const data = drag.data as Partial<Task> | undefined;
    return !!data?.id && "priority" in data;
  };

  onDropColumn(event: CdkDragDrop<Column[], Column[], Column>): void {
    const draggedColumn = event.item.data;

    if (!draggedColumn?.id) {
      return;
    }

    const fromColumnIndex = event.previousIndex;
    const toColumnIndex = event.currentIndex;

    if (fromColumnIndex === toColumnIndex) {
      return;
    }

    this.kanbanStore.moveColumn(fromColumnIndex, toColumnIndex);
  }

  onDropTask(event: CdkDragDrop<Column, Column, Task>) {
    const task = event.item.data;
    const fromColumn = event.previousContainer.data;
    const toColumn = event.container.data;

    if (!task?.id || !fromColumn?.id || !toColumn?.id) {
      return;
    }

    this.kanbanStore.moveTask(
      task.id,
      fromColumn.id,
      toColumn.id,
      event.previousIndex,
      event.currentIndex,
    );
  }

  onColorChange(color: OmniSyncColors) {
    this.modalColor.set(color);
  }

  private openModal(taskInfo?: ModalTaskInfo) {
    if (taskInfo) {
      const column = this.kanbanStore.getColumnById(taskInfo.columnId);
      if (!column) {
        return;
      }

      if (taskInfo.taskId && !column.tasks.some((task) => task.id === taskInfo.taskId)) {
        return;
      }

      this.addTaskModalInfo.set(taskInfo);
      this.selectedModal.set("addTask");
    } else {
      this.selectedModal.set("addColumn");
    }
  }
}
