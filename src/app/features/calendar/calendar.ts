import { Component, computed, effect, inject, signal, viewChild } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";
import { map } from "rxjs";
import { CdkDragDrop } from "@angular/cdk/drag-drop";

import { FullCalendarComponent, FullCalendarModule } from "@fullcalendar/angular";
import { CalendarOptions } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import multiMonthPlugin from "@fullcalendar/multimonth";

import { KanbanStore } from "../kanban/services/kanban-store";
import { Board } from "../../core/models/board";
import { ViewBoardsModal } from "../kanban/components/view-boards-modal/view-boards-modal";
import { Modal } from "../../shared/components/modal/modal";
import { AddTaskForm } from "../kanban/components/add-task-form/add-task-form";
import { TaskExpandBody } from "../kanban/components/task-expand-body/task-expand-body";
import { OmniSyncColors } from "../../shared/UI/colors";

interface CalendarSortEvent {
  extendedProps?: Record<string, unknown>;
  title?: string;
}

type CalendarChangeView = (viewName: string, date?: Date | string) => void;

interface ModalTaskInfo {
  columnId: string;
  taskId?: string;
}

@Component({
  selector: "os-calendar",
  imports: [
    CommonModule,
    FullCalendarModule,
    ViewBoardsModal,
    Modal,
    AddTaskForm,
    TaskExpandBody,
  ],
  templateUrl: "./calendar.html",
  styleUrl: "./calendar.css",
})
export class Calendar {
  private static readonly LAST_SORT_ORDER = Number.MAX_SAFE_INTEGER;

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly kanbanStore = inject(KanbanStore);
  private readonly routeBoardPublicId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get("boardId"))),
    { initialValue: null },
  );
  private readonly currentTasks = this.kanbanStore.currentTasks;
  private readonly currentColumns = this.kanbanStore.currentColumns;
  private readonly calendarRef = viewChild<FullCalendarComponent>("calendar");

  readonly boards = this.kanbanStore.boards;
  readonly myBoards = computed(() => this.boards().filter((b) => !b.sharedFromOwnerId));
  readonly sharedBoards = computed(() => this.boards().filter((b) => !!b.sharedFromOwnerId));
  readonly currentBoard = this.kanbanStore.currentBoard;
  readonly viewBoards = signal(false);
  readonly calendarEvents = computed(() => this.buildCalendarEvents());

  readonly taskViewInfo = signal<{ columnId: string; taskId: string } | null>(null);
  readonly addTaskModalInfo = signal<ModalTaskInfo | null>(null);
  readonly selectedTaskModal = signal<"addTask" | null>(null);
  readonly modalColor = signal<OmniSyncColors>("indigo");

  readonly viewTask = computed(() => {
    const info = this.taskViewInfo();
    if (!info) {
      return null;
    }
    return this.kanbanStore.tasks().find((t) => t.id === info.taskId) ?? null;
  });

  readonly viewTaskColumn = computed(() => {
    const info = this.taskViewInfo();
    if (!info) {
      return null;
    }
    return this.kanbanStore.getColumnById(info.columnId) ?? null;
  });

  readonly taskViewModalBadge = computed(() => this.viewTaskColumn()?.header ?? "");
  readonly taskViewModalColor = computed(() => this.viewTaskColumn()?.color ?? "indigo");

  readonly addTaskModalColumn = computed(() => {
    const info = this.addTaskModalInfo();
    if (!info) {
      return null;
    }
    return this.kanbanStore.getColumnById(info.columnId) ?? null;
  });

  readonly modalBadge = computed(() => this.addTaskModalColumn()?.header ?? "");

  constructor() {
    effect(() => {
      const boards = this.boards();
      const boardPublicId = this.routeBoardPublicId();

      if (boards.length === 0) {
        return;
      }

      if (!boardPublicId) {
        void this.router.navigate(["/calendar", this.currentBoard().publicId], {
          replaceUrl: true,
        });
        return;
      }

      const matchedBoard = this.kanbanStore.getBoardByPublicId(boardPublicId);

      if (!matchedBoard) {
        void this.router.navigate(["/calendar", this.currentBoard().publicId], {
          replaceUrl: true,
        });
        return;
      }

      this.kanbanStore.setCurrentBoard(matchedBoard.id);
    });

    effect(() => {
      this.calendarEvents();
      const calendarApi = this.calendarRef()?.getApi();
      if (!calendarApi) {
        return;
      }

      calendarApi.refetchEvents();
    });

    effect(() => {
      const info = this.addTaskModalInfo();
      const column = this.addTaskModalColumn();
      if (info && column) {
        this.modalColor.set(column.color);
      }
    });

    effect(() => {
      const info = this.taskViewInfo();
      const task = this.viewTask();
      if (info && !task) {
        this.taskViewInfo.set(null);
      }
    });
  }

  calendarOptions: CalendarOptions = {
    initialView: "dayGridMonth",
    plugins: [dayGridPlugin, multiMonthPlugin, interactionPlugin],
    height: "100%",
    expandRows: true,
    displayEventTime: false,
    navLinks: true,

    headerToolbar: {
      left: "prev,next,today",
      center: "title",
      right: "dayGridMonth,multiMonthYear",
    },

    buttonText: {
      today: "Today",
      year: "Year",
      month: "Month",
    },

    viewDidMount: (arg) =>
      this.bindViewNavigationHandlers(
        arg.view.type,
        arg.view.currentStart,
        arg.view.calendar.changeView.bind(arg.view.calendar),
      ),
    eventOrder: (a, b) => this.compareEvents(a as CalendarSortEvent, b as CalendarSortEvent),
    eventOrderStrict: true,
    events: (_info, successCallback) => {
      successCallback(this.calendarEvents());
    },
    eventClick: (info) => {
      const taskId = info.event.extendedProps["taskId"] as string | undefined;
      const columnId = info.event.extendedProps["columnId"] as string | undefined;

      if (
        taskId &&
        columnId &&
        this.kanbanStore.hasTaskInColumn(columnId, taskId)
      ) {
        this.taskViewInfo.set({ columnId, taskId });
      }
    },
  };

  private bindViewNavigationHandlers(
    viewType: string,
    currentStart: Date,
    changeView: CalendarChangeView,
  ): void {
    const titleElement = document.querySelector<HTMLElement>(".fc-toolbar-title");
    if (!titleElement) return;

    if (viewType === "dayGridMonth") {
      titleElement.classList.add("fc-title-clickable");
      titleElement.onclick = () => {
        changeView("multiMonthYear", currentStart);
      };
      return;
    }

    titleElement.classList.remove("fc-title-clickable");
    titleElement.onclick = null;

    const monthTitleElements = document.querySelectorAll<HTMLElement>(".fc-multimonth-title");

    monthTitleElements.forEach((monthTitleElement) => {
      monthTitleElement.onclick = () => {
        const monthContainer = monthTitleElement.closest<HTMLElement>(".fc-multimonth-month");
        const monthStartDate = monthContainer?.getAttribute("data-date");
        if (!monthStartDate) return;

        changeView("dayGridMonth", monthStartDate);
      };
    });
  }

  private compareEvents(eventA: CalendarSortEvent, eventB: CalendarSortEvent): number {
    const aColumnOrder = this.readSortOrder(eventA, "columnOrder");
    const bColumnOrder = this.readSortOrder(eventB, "columnOrder");
    if (aColumnOrder !== bColumnOrder) {
      return aColumnOrder - bColumnOrder;
    }

    const aTaskOrder = this.readSortOrder(eventA, "taskOrder");
    const bTaskOrder = this.readSortOrder(eventB, "taskOrder");
    if (aTaskOrder !== bTaskOrder) {
      return aTaskOrder - bTaskOrder;
    }

    return (eventA.title ?? "").localeCompare(eventB.title ?? "");
  }

  private readSortOrder(event: CalendarSortEvent, key: "columnOrder" | "taskOrder"): number {
    return Number(event.extendedProps?.[key] ?? Calendar.LAST_SORT_ORDER);
  }

  private buildCalendarEvents() {
    const columns = this.currentColumns();
    const columnOrderById = new Map(columns.map((column, index) => [column.id, index]));
    const taskOrderById = new Map(
      columns.flatMap((column) => column.tasksIds.map((taskId, index) => [taskId, index] as const)),
    );

    return this.currentTasks().map((task) => ({
      title: task.title,
      start: task.startDate,
      end: task.dueDate,
      color: `var(--color-os-${this.kanbanStore.getColumnById(task.columnId)?.color ?? "indigo"})`,
      extendedProps: {
        taskId: task.id,
        columnId: task.columnId,
        columnOrder: columnOrderById.get(task.columnId) ?? Calendar.LAST_SORT_ORDER,
        taskOrder: taskOrderById.get(task.id) ?? Calendar.LAST_SORT_ORDER,
      },
    }));
  }

  closeTaskView(): void {
    this.taskViewInfo.set(null);
  }

  onEditFromTaskView(): void {
    const info = this.taskViewInfo();
    if (!info) {
      return;
    }

    this.taskViewInfo.set(null);
    this.openEditTaskModal({ columnId: info.columnId, taskId: info.taskId });
  }

  closeAddTaskModal(): void {
    this.addTaskModalInfo.set(null);
    this.selectedTaskModal.set(null);
  }

  onModalColumnChanged(columnId: string): void {
    this.addTaskModalInfo.update((value) => (value ? { ...value, columnId } : value));
  }

  onViewBoards() {
    this.viewBoards.update((prev) => !prev);
  }

  closeModal(): void {
    this.viewBoards.set(false);
  }

  async onLeaveSharedBoard(boardId: string): Promise<void> {
    const result = await this.kanbanStore.leaveSharedBoard(boardId);
    if (result.ok) {
      this.closeModal();
    }
  }

  private openEditTaskModal(taskInfo: ModalTaskInfo): void {
    const column = this.kanbanStore.getColumnById(taskInfo.columnId);

    if (!column) {
      return;
    }

    if (
      taskInfo.taskId &&
      !this.kanbanStore.hasTaskInColumn(taskInfo.columnId, taskInfo.taskId)
    ) {
      return;
    }

    this.addTaskModalInfo.set(taskInfo);
    this.selectedTaskModal.set("addTask");
  }

  onSelectBoard(boardPublicId: string): void {
    const matchedBoard = this.kanbanStore.getBoardByPublicId(boardPublicId);
    if (matchedBoard) {
      this.kanbanStore.setCurrentBoard(matchedBoard.id);
    }

    this.closeTaskView();
    this.closeAddTaskModal();
    this.closeModal();
  }

  onDropBoard(event: CdkDragDrop<Board[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    this.kanbanStore.moveBoard(event.previousIndex, event.currentIndex);
  }
}
