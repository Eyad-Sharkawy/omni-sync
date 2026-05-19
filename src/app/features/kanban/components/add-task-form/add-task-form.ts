import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from "@angular/core";
import { takeUntilDestroyed, toSignal } from "@angular/core/rxjs-interop";
import { ReactiveFormsModule } from "@angular/forms";

import { KanbanStore } from "../../services/kanban-store";
import { Task } from "../../../../core/models/task";
import { OmniSyncColors } from "../../../../shared/UI/colors";
import { createTaskForm } from "./task-form.factory";
import { mapFormToSubmit } from "./task-form.mapper";
import { patchFormFromTask } from "./task-form.init";
import { showContorlError } from "../../../../shared/forms/form-utils";
import { TaskTags } from "./components/task-tags/task-tags";
import { TaskAiFacade } from "./task-ai/task-ai.facade";
import { AiGenerateField } from "./task-ai/task-ai.types";

@Component({
  selector: "os-add-task-form",
  imports: [ReactiveFormsModule, TaskTags],
  providers: [TaskAiFacade],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./add-task-form.html",
  styleUrl: "./add-task-form.css",
})
export class AddTaskForm {
  private readonly kanbanStore = inject(KanbanStore);
  private readonly taskAi = inject(TaskAiFacade);
  readonly initialInfo = input.required<{ columnId: string; taskId?: string }>();
  readonly closed = output<void>();
  readonly selectedColumnChanged = output<string>();

  readonly columns = this.kanbanStore.currentColumns;
  readonly selectedColumn = signal(this.columns()[0]);
  readonly selectedTags = signal<Task["tags"]>([]);
  readonly isEditMode = signal(false);

  readonly aiError = signal<string | null>(null);

  readonly generatingAll = computed(() => this.taskAi.isGeneratingAll());
  readonly generatingDescription = computed(() => this.taskAi.isGenerating("description"));
  readonly generatingPriority = computed(() => this.taskAi.isGenerating("priority"));
  readonly generatingDueDate = computed(() => this.taskAi.isGenerating("dueDate"));
  readonly generatingTags = computed(() => this.taskAi.isGenerating("tags"));

  readonly color = computed<OmniSyncColors>(() => {
    return this.selectedColumn().color;
  });

  protected readonly form = createTaskForm();

  protected readonly showControlError = showContorlError;

  readonly minDueDate = toSignal(this.form.controls.startDate.valueChanges, {
    initialValue: this.form.controls.startDate.value,
  });

  constructor() {
    this.form.controls.column.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      if (value) {
        const column = this.kanbanStore.getColumnById(value);

        if (column) {
          this.selectedColumn.set(column);
          this.emitSelectedColumnChanged();
        }
      }
    });

    afterNextRender(() => {
      const selectedCol = this.columns().find(
        (column) => this.initialInfo().columnId === column.id,
      );

      const selectedTask = this.kanbanStore
        .tasks()
        .find((task) => task.id === this.initialInfo().taskId);

      if (selectedTask) {
        this.selectedTags.set(selectedTask.tags);
        this.isEditMode.set(true);
        patchFormFromTask(this.form, selectedTask);

        const taskColumn = this.kanbanStore.getColumnById(selectedTask.columnId);
        if (taskColumn) {
          this.selectedColumn.set(taskColumn);
        }
      } else {
        if (selectedCol) {
          this.selectedColumn.set(selectedCol);
        }
        this.form.controls.column.setValue(this.selectedColumn().id);
      }

      this.emitSelectedColumnChanged();
    });
  }

  onSubmit() {
    const result = mapFormToSubmit(this.form, this.selectedTags());

    if (!result.ok) {
      switch (result.reason) {
        case "invalid":
          this.form.markAllAsTouched();
          this.form.markAllAsDirty();
          break;

        case "beforeStart":
          this.form.controls.dueDate.setErrors({ beforeStart: true });
          break;
      }
      return;
    }

    const taskId = this.initialInfo().taskId;
    const { columnId, input } = result;

    if (taskId) {
      const existing = this.kanbanStore.tasks().find((task) => task.id === taskId);

      if (existing && existing.columnId !== columnId) {
        const fromColumn = this.kanbanStore.getColumnById(existing.columnId);
        const toColumn = this.kanbanStore.getColumnById(columnId);

        if (fromColumn && toColumn) {
          const fromIndex = fromColumn.tasksIds.indexOf(taskId);
          this.kanbanStore.moveTask(
            taskId,
            existing.columnId,
            columnId,
            fromIndex,
            toColumn.tasksIds.length,
          );
        }
      }

      this.kanbanStore.updateTask(taskId, input);
    } else {
      this.kanbanStore.addTaskToColumn(columnId, input);
    }

    this.onModalClosed();
  }

  onModalClosed(): void {
    this.closed.emit();
  }

  private async runAi(fields: AiGenerateField[]): Promise<void> {
    const result = await this.taskAi.generate(
      this.form,
      fields,
      this.selectedColumn().header,
      this.selectedTags(),
    );
    if (!result.ok) {
      this.aiError.set(result.error);
      return;
    }
    this.aiError.set(null);
    this.selectedTags.set(result.tags);
  }

  async onGenerateDescription(): Promise<void> {
    await this.runAi(["description"]);
  }

  async onGeneratePriority(): Promise<void> {
    await this.runAi(["priority"]);
  }

  async onGenerateDueDate(): Promise<void> {
    await this.runAi(["dueDate"]);
  }

  async onGenerateTags(): Promise<void> {
    await this.runAi(["tags"]);
  }

  async onGenerateAll(): Promise<void> {
    await this.runAi(["description", "priority", "dueDate", "tags"]);
  }

  private emitSelectedColumnChanged(): void {
    this.selectedColumnChanged.emit(this.selectedColumn().id);
  }
}
