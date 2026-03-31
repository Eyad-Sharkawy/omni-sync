import {
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import { DatePipe, NgOptimizedImage } from "@angular/common";

import {
  CdkDrag,
  CdkDragHandle,
  CdkDragDrop,
  CdkDragMove,
  CdkDropList,
  CdkDropListGroup,
} from "@angular/cdk/drag-drop";
import { CdkScrollable } from "@angular/cdk/scrolling";

import { TaskCard } from "../../shared/components/task-card/task-card";
import { TasksColumn } from "../../shared/components/tasks-column/tasks-column";
import { TaskTag } from "../../shared/components/task-tag/task-tag";
import { KanbanStore } from "./services/kanban-store";
import { Modal } from "../../shared/components/modal/modal";
import { Column } from "../../core/models/column";
import { Task } from "../../core/models/task";
import { Board } from "../../core/models/board";
import { AddTaskForm } from "./components/add-task-form/add-task-form";
import { OmniSyncColors } from "../../shared/UI/colors";
import { AddColumnForm } from "./components/add-column-form/add-column-form";
import { CreateBoardForm } from "./components/create-board-form/create-board-form";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";
import { map } from "rxjs";

interface ModalTaskInfo {
  columnId: string;
  taskId?: string;
}

type ModalType = "addTask" | "addColumn" | "addBoard";

@Component({
  selector: "os-kanban",
  imports: [
    TaskCard,
    TasksColumn,
    TaskTag,
    DatePipe,
    NgOptimizedImage,
    Modal,
    AddTaskForm,
    CdkDrag,
    CdkDragHandle,
    CdkDropList,
    CdkDropListGroup,
    CdkScrollable,
    AddColumnForm,
    CreateBoardForm,
    RouterLink,
  ],
  templateUrl: "./kanban.html",
  styleUrl: "./kanban.css",
})
export class Kanban {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly routeBoardId = toSignal(
    this.route.paramMap.pipe(map((prams) => prams.get("boardId"))),
    { initialValue: null },
  );

  private readonly kanbanStore = inject(KanbanStore);
  private readonly destroyRef = inject(DestroyRef);

  private readonly boardScroll = viewChild.required<ElementRef<HTMLElement>>("boardScroll");
  private readonly edgeThreshold = 80;
  private readonly maxScrollStep = 24;
  private readonly autoScrollFrame = signal<number | null>(null);
  private readonly latestPointer = signal({ x: 0, y: 0 });
  private readonly isDragging = signal(false);

  readonly selectedModal = signal<ModalType | null>(null);
  readonly showViewBoardModal = signal<boolean>(false);

  readonly boards = this.kanbanStore.boards;
  readonly currentBoard = this.kanbanStore.currentBoard;
  columns = this.kanbanStore.columns;
  addTaskModalInfo = signal<ModalTaskInfo | null>(null);
  addColumnModalInfo = signal<ModalTaskInfo | null>(null);
  editBoardModalId = signal<string | null>(null);
  modalColumn = computed(() => {
    const modalInfo = this.addTaskModalInfo() ?? this.addColumnModalInfo();
    if (!modalInfo) {
      return null;
    }

    return this.kanbanStore.getColumnById(modalInfo.columnId) ?? null;
  });

  modalBadge = computed(() => this.modalColumn()?.header ?? "");
  modalColor = signal<OmniSyncColors>("indigo");

  constructor() {
    effect(() => {
      const boards = this.boards();
      const boardId = this.routeBoardId();

      if (boards.length === 0) {
        return;
      }

      if (!boardId) {
        this.router.navigate(["/kanban", this.currentBoard().id], { replaceUrl: true });
        return;
      }

      const exists = boards.some((board) => board.id === boardId);

      if (!exists) {
        this.router.navigate(["/kanban", this.currentBoard().id], { replaceUrl: true });
        return;
      }

      this.kanbanStore.setCurrentBoard(boardId);
    });

    effect(() => {
      this.modalColor.set(this.modalColumn()?.color ?? "indigo");
    });

    this.destroyRef.onDestroy(() => {
      this.stopAutoScrollLoop();
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

  onAddBoard(): void {
    this.editBoardModalId.set(null);
    this.showViewBoardModal.set(false);
    this.selectedModal.set("addBoard");
  }

  onBoardCreated(boardId: string): void {
    this.closeModal();
    this.router.navigate(["/kanban", boardId]);
  }

  onEditBoard(boardId: string): void {
    this.editBoardModalId.set(boardId);
    this.showViewBoardModal.set(false);
    this.selectedModal.set("addBoard");
  }

  onDeleteBoard(boardId: string): void {
    if (this.boards().length <= 1) {
      return;
    }

    this.kanbanStore.removeBoard(boardId);
  }

  onDropBoard(event: CdkDragDrop<Board[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    this.kanbanStore.moveBoard(event.previousIndex, event.currentIndex);
  }

  onEditTask(taskInfo: ModalTaskInfo) {
    this.openModal(taskInfo);
  }

  closeModal() {
    this.addTaskModalInfo.set(null);
    this.addColumnModalInfo.set(null);
    this.editBoardModalId.set(null);
    this.selectedModal.set(null);
    this.showViewBoardModal.set(false);
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
    this.isDragging.set(true);
    document.body.classList.add("is-dragging");
    this.startAutoScrollLoop();
  }

  onDragEnded(): void {
    this.isDragging.set(false);
    document.body.classList.remove("is-dragging");
    this.stopAutoScrollLoop();
  }

  onDragMoved(event: CdkDragMove<Column | Task>): void {
    this.latestPointer.set(event.pointerPosition);
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

  onBoardWheel(event: WheelEvent): void {
    const target = event.target as HTMLElement | null;
    const taskList = target?.closest(".tasks-list") as HTMLElement | null;

    if (taskList) {
      const verticalDelta = event.deltaY || event.deltaX;

      if (verticalDelta !== 0) {
        const isVerticallyScrollable = taskList.scrollHeight > taskList.clientHeight;

        if (isVerticallyScrollable) {
          taskList.scrollTop += verticalDelta;
          event.preventDefault();
          return;
        }
      }
    }

    const boardElement = this.boardScroll().nativeElement;
    const horizontalDelta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (horizontalDelta === 0) {
      return;
    }

    const previousScrollLeft = boardElement.scrollLeft;
    boardElement.scrollLeft += horizontalDelta;

    if (boardElement.scrollLeft !== previousScrollLeft) {
      event.preventDefault();
    }
  }

  onViewBoards() {
    this.showViewBoardModal.update((prev) => !prev);
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

  private startAutoScrollLoop(): void {
    if (this.autoScrollFrame() !== null) {
      return;
    }

    const tick = () => {
      if (!this.isDragging()) {
        this.autoScrollFrame.set(null);
        return;
      }

      this.applyEdgeScroll();
      this.autoScrollFrame.set(requestAnimationFrame(tick));
    };

    this.autoScrollFrame.set(requestAnimationFrame(tick));
  }

  private stopAutoScrollLoop(): void {
    const scrollFrame = this.autoScrollFrame();
    if (scrollFrame !== null) {
      cancelAnimationFrame(scrollFrame);
      this.autoScrollFrame.set(null);
    }
  }

  private applyEdgeScroll(): void {
    const boardElement = this.boardScroll().nativeElement;
    const boardRect = boardElement.getBoundingClientRect();

    const leftEdgeDistance = boardRect.left + this.edgeThreshold - this.latestPointer().x;
    const rightEdgeDistance = this.latestPointer().x - (boardRect.right - this.edgeThreshold);

    if (leftEdgeDistance > 0) {
      boardElement.scrollLeft -= this.resolveScrollStep(leftEdgeDistance);
    } else if (rightEdgeDistance > 0) {
      boardElement.scrollLeft += this.resolveScrollStep(rightEdgeDistance);
    }

    const targetElement = document.elementFromPoint(this.latestPointer().x, this.latestPointer().y);
    const taskList = targetElement?.closest(".tasks-list") as HTMLElement | null;

    if (taskList) {
      const taskListRect = taskList.getBoundingClientRect();
      const topEdgeDistance = taskListRect.top + this.edgeThreshold - this.latestPointer().y;
      const bottomEdgeDistance =
        this.latestPointer().y - (taskListRect.bottom - this.edgeThreshold);

      if (topEdgeDistance > 0) {
        taskList.scrollTop -= this.resolveScrollStep(topEdgeDistance);
      } else if (bottomEdgeDistance > 0) {
        taskList.scrollTop += this.resolveScrollStep(bottomEdgeDistance);
      }
    }
  }

  private resolveScrollStep(distanceToEdge: number): number {
    const clampedDistance = Math.min(this.edgeThreshold, Math.max(0, distanceToEdge));
    const intensity = clampedDistance / this.edgeThreshold;

    return Math.ceil(intensity * this.maxScrollStep);
  }
}
