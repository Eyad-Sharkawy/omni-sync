import { signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { vi } from "vitest";

import { AddTaskForm } from "./add-task-form";
import { KanbanStore } from "../../services/kanban-store";

describe("AddTaskForm", () => {
  let component: AddTaskForm;
  let fixture: ComponentFixture<AddTaskForm>;
  const column = {
    id: "column-1",
    header: "Todo",
    color: "indigo" as const,
    boardId: "board-1",
    tasksIds: ["task-1"],
  };
  const task = {
    id: "task-1",
    title: "Existing task",
    priority: "medium" as const,
    columnId: "column-1",
    tags: [],
    startDate: new Date("2026-04-01"),
    dueDate: new Date("2026-04-02"),
  };
  const kanbanStoreMock = {
    columns: signal([column]),
    tasks: signal([task]),
    getColumnById: vi.fn((columnId: string) => (columnId === column.id ? column : undefined)),
    hasTaskInColumn: vi.fn(() => true),
    updateTask: vi.fn(),
    addTaskToColumn: vi.fn(),
  };

  beforeEach(async () => {
    kanbanStoreMock.getColumnById.mockClear();
    kanbanStoreMock.hasTaskInColumn.mockReset();
    kanbanStoreMock.hasTaskInColumn.mockReturnValue(true);
    kanbanStoreMock.updateTask.mockClear();
    kanbanStoreMock.addTaskToColumn.mockClear();

    await TestBed.configureTestingModule({
      imports: [AddTaskForm],
      providers: [{ provide: KanbanStore, useValue: kanbanStoreMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(AddTaskForm);
    component = fixture.componentInstance;
    fixture.componentRef.setInput("initialInfo", { columnId: column.id });
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("updates an existing task instead of adding a duplicate", async () => {
    fixture.componentRef.setInput("initialInfo", { columnId: column.id, taskId: task.id });
    fixture.detectChanges();
    await fixture.whenStable();

    const form = (component as AddTaskForm & { form: AddTaskForm["form"] }).form;

    form.controls.title.setValue("Updated title");
    form.controls.priority.setValue("high");
    form.controls.startDate.setValue("2026-04-03");
    form.controls.dueDate.setValue("2026-04-04");

    component.onSubmit();

    expect(kanbanStoreMock.hasTaskInColumn).toHaveBeenCalledWith(column.id, task.id);
    expect(kanbanStoreMock.updateTask).toHaveBeenCalledWith(
      task.id,
      expect.objectContaining({
        title: "Updated title",
        priority: "high",
        startDate: new Date("2026-04-03"),
        dueDate: new Date("2026-04-04"),
      }),
    );
    expect(kanbanStoreMock.addTaskToColumn).not.toHaveBeenCalled();
  });
});
