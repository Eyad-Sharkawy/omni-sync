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

interface CalendarSortEvent {
  extendedProps?: Record<string, unknown>;
  title?: string;
}

type CalendarChangeView = (viewName: string, date?: Date | string) => void;

@Component({
  selector: "os-calender",
  imports: [CommonModule, FullCalendarModule, ViewBoardsModal],
  templateUrl: "./calender.html",
  styleUrl: "./calender.css",
})
export class Calender {
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
  readonly currentBoard = this.kanbanStore.currentBoard;
  readonly viewBoards = signal(false);
  readonly calendarEvents = computed(() => this.buildCalendarEvents());

  constructor() {
    effect(() => {
      const boards = this.boards();
      const boardPublicId = this.routeBoardPublicId();

      if (boards.length === 0) {
        return;
      }

      if (!boardPublicId) {
        void this.router.navigate(["/calender", this.currentBoard().publicId], {
          replaceUrl: true,
        });
        return;
      }

      const matchedBoard = this.kanbanStore.getBoardByPublicId(boardPublicId);

      if (!matchedBoard) {
        void this.router.navigate(["/calender", this.currentBoard().publicId], {
          replaceUrl: true,
        });
        return;
      }

      this.kanbanStore.setCurrentBoard(matchedBoard.id);
    });

    effect(() => {
      const calendarApi = this.calendarRef()?.getApi();
      if (!calendarApi) {
        return;
      }

      calendarApi.removeAllEvents();
      calendarApi.addEventSource(this.calendarEvents());
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
    events: this.calendarEvents(),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    eventClick: (arg) => {
      /* empty */
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
    return Number(event.extendedProps?.[key] ?? Calender.LAST_SORT_ORDER);
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
        columnOrder: columnOrderById.get(task.columnId) ?? Calender.LAST_SORT_ORDER,
        taskOrder: taskOrderById.get(task.id) ?? Calender.LAST_SORT_ORDER,
      },
    }));
  }

  onViewBoards() {
    this.viewBoards.update((prev) => !prev);
  }

  closeModal(): void {
    this.viewBoards.set(false);
  }

  onDropBoard(event: CdkDragDrop<Board[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    this.kanbanStore.moveBoard(event.previousIndex, event.currentIndex);
  }
}
