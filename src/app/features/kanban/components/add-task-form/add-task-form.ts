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
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from "@angular/forms";

import { KanbanStore } from "../../services/kanban-store";
import { Task } from "../../../../core/models/task";
import { ALL_COLORS, OmniSyncColors } from "../../../../shared/UI/colors";
import { TaskTag } from "../task-tag/task-tag";
import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from "@angular/cdk/drag-drop";
import { nanoid } from "nanoid";
import { Gemini, TaskGenerationContext } from "../../../../core/services/gemini/gemini";

@Component({
  selector: "os-add-task-form",
  imports: [ReactiveFormsModule, TaskTag, CdkDrag, CdkDropList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./add-task-form.html",
  styleUrl: "./add-task-form.css",
})
export class AddTaskForm {
  private readonly kanbanStore = inject(KanbanStore);
  private readonly gemini = inject(Gemini);
  readonly initialInfo = input.required<{ columnId: string; taskId?: string }>();
  readonly closed = output<void>();
  readonly selectedColumnChanged = output<string>();

  readonly columns = this.kanbanStore.currentColumns;
  readonly selectedColumn = signal(this.columns()[0]);
  readonly selectedTags = signal<Task["tags"]>([]);
  readonly isEditMode = signal(false);
  readonly aiError = signal<string | null>(null);
  readonly generatingDescription = signal(false);
  readonly generatingPriority = signal(false);
  readonly generatingDueDate = signal(false);
  readonly generatingTags = signal(false);
  readonly generatingAll = signal(false);
  readonly color = computed<OmniSyncColors>(() => {
    return this.selectedColumn().color;
  });

  protected form = new FormGroup(
    {
      title: new FormControl("", {
        validators: [Validators.required],
      }),
      description: new FormControl(""),
      priority: new FormControl<"low" | "medium" | "high" | null>("medium", {
        validators: [Validators.required],
      }),
      column: new FormControl("", {
        validators: [Validators.required],
      }),
      tags: new FormControl(""),
      startDate: new FormControl(new Date().toISOString().split("T")[0], {
        validators: [Validators.required],
      }),
      dueDate: new FormControl("", {
        validators: [Validators.required],
      }),
    },
    { validators: dateRangeValidator },
  );

  readonly minDueDate = toSignal(this.form.controls.startDate.valueChanges, {
    initialValue: new Date().toISOString().split("T")[0],
  });

  get titleIsInvalid(): boolean {
    const title = this.form.controls.title;
    return title.invalid && title.touched && title.dirty;
  }

  get priorityIsInvalid(): boolean {
    const priority = this.form.controls.priority;
    return priority.invalid && priority.touched && priority.dirty;
  }

  get columnIsInvalid(): boolean {
    const column = this.form.controls.column;
    return column.invalid && column.touched && column.dirty;
  }

  get startDateIsInvalid(): boolean {
    const startDate = this.form.controls.startDate;
    return startDate.invalid && startDate.touched && startDate.dirty;
  }

  get dueDateIsInvalid(): boolean {
    const dueDate = this.form.controls.dueDate;
    return dueDate.invalid && dueDate.touched && dueDate.dirty;
  }

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

      if (selectedCol) {
        this.selectedColumn.set(selectedCol);
      }

      const selectedTask = this.kanbanStore
        .tasks()
        .find((task) => task.id === this.initialInfo().taskId);

      if (selectedTask) {
        this.selectedTags.set(selectedTask.tags);
        this.isEditMode.set(true);

        const controls = this.form.controls;

        controls.title.setValue(selectedTask.title);
        controls.description.setValue(selectedTask.description ?? "");
        controls.priority.setValue(selectedTask.priority);
        controls.column.disable();
        controls.startDate.setValue(selectedTask.startDate.toISOString().split("T")[0]);
        controls.dueDate.setValue(selectedTask.dueDate.toISOString().split("T")[0]);
      }

      this.form.controls.column.setValue(this.selectedColumn().id);
      this.emitSelectedColumnChanged();
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.form.markAllAsDirty();
      return;
    }

    const { title, description, priority, column, startDate, dueDate } = this.form.getRawValue();

    if (!title || !priority || !column || !startDate || !dueDate) {
      return;
    }

    const start = new Date(startDate);
    const due = new Date(dueDate);
    const normalizedDescription = description?.trim() || undefined;

    if (due < start) {
      this.form.controls.dueDate.setErrors({ beforeStart: true });
      return;
    }

    const taskId = this.initialInfo().taskId;

    if (taskId && this.kanbanStore.hasTaskInColumn(this.selectedColumn().id, taskId)) {
      this.kanbanStore.updateTask(taskId, {
        title: title.trim(),
        description: normalizedDescription,
        priority: priority,
        startDate: start,
        dueDate: due,
        tags: this.selectedTags(),
      });
    } else {
      this.kanbanStore.addTaskToColumn(column, {
        title: title.trim(),
        description: normalizedDescription,
        priority: priority,
        startDate: start,
        dueDate: due,
        tags: this.selectedTags(),
      });
    }

    this.onModalClosed();
  }

  onModalClosed(): void {
    this.closed.emit();
  }

  async onGenerateDescription(): Promise<void> {
    await this.generateFromTitle(["description"]);
  }

  async onGeneratePriority(): Promise<void> {
    await this.generateFromTitle(["priority"]);
  }

  async onGenerateDueDate(): Promise<void> {
    await this.generateFromTitle(["dueDate"]);
  }

  async onGenerateAll(): Promise<void> {
    await this.generateFromTitle(["description", "priority", "dueDate", "tags"]);
  }

  async onGenerateTags(): Promise<void> {
    await this.generateFromTitle(["tags"]);
  }

  private emitSelectedColumnChanged(): void {
    this.selectedColumnChanged.emit(this.selectedColumn().id);
  }

  private buildGenerationContext(): TaskGenerationContext {
    const raw = this.form.getRawValue();
    const description = raw.description?.trim() ?? "";
    const dueDate = raw.dueDate?.trim() ?? "";
    const priority = raw.priority;

    const tagTexts = this.selectedTags().map((tag) => tag.text);

    const context: TaskGenerationContext = {
      columnLabel: this.selectedColumn().header,
    };

    if (description) {
      context.existingDescription = description;
    }
    if (priority) {
      context.existingPriority = priority;
    }
    if (dueDate) {
      context.existingDueDate = dueDate;
    }
    if (tagTexts.length > 0) {
      context.existingTags = tagTexts;
    }

    return context;
  }

  private async generateFromTitle(
    fields: ("description" | "priority" | "dueDate" | "tags")[],
  ): Promise<void> {
    const title = this.form.controls.title.value?.trim() ?? "";
    const startDate = this.form.controls.startDate.value;

    if (!title) {
      this.form.controls.title.markAsDirty();
      this.form.controls.title.markAsTouched();
      this.aiError.set("Add a task title first.");
      return;
    }

    if (!startDate) {
      this.aiError.set("Add a start date first.");
      return;
    }

    this.aiError.set(null);
    this.setGenerating(fields, true);

    try {
      const suggestion = await this.gemini.generateTaskMetadata(
        title,
        startDate,
        fields,
        this.buildGenerationContext(),
      );

      if (fields.includes("description") && suggestion.description !== undefined) {
        this.form.controls.description.setValue(suggestion.description.trim());
      }

      if (
        fields.includes("priority") &&
        (suggestion.priority === "low" ||
          suggestion.priority === "medium" ||
          suggestion.priority === "high")
      ) {
        this.form.controls.priority.setValue(suggestion.priority);
      }

      if (fields.includes("dueDate") && suggestion.dueDate && this.isValidDueDate(suggestion.dueDate)) {
        this.form.controls.dueDate.setValue(suggestion.dueDate);
      }

      if (fields.includes("tags") && suggestion.tags && suggestion.tags.length > 0) {
        const current = this.selectedTags();
        const existingSet = new Set(current.map((tag) => tag.text.toLowerCase()));
        const generated = suggestion.tags
          .filter((tag) => {
            const key = tag.toLowerCase();
            if (existingSet.has(key)) return false;
            existingSet.add(key);
            return true;
          })
          .slice(0, 4)
          .map((text) => ({
            id: nanoid(),
            text,
            color: ALL_COLORS[Math.floor(Math.random() * ALL_COLORS.length)],
          }));

        if (generated.length > 0) {
          this.selectedTags.set([...current, ...generated]);
        }
      }
    } catch {
      this.aiError.set("Could not generate suggestions right now. Please try again.");
    } finally {
      this.setGenerating(fields, false);
    }
  }

  private setGenerating(
    fields: ("description" | "priority" | "dueDate" | "tags")[],
    active: boolean,
  ): void {
    this.generatingAll.set(fields.length === 4 ? active : this.generatingAll());

    if (fields.includes("description")) {
      this.generatingDescription.set(active);
    }

    if (fields.includes("priority")) {
      this.generatingPriority.set(active);
    }

    if (fields.includes("dueDate")) {
      this.generatingDueDate.set(active);
    }

    if (fields.includes("tags")) {
      this.generatingTags.set(active);
    }
  }

  private isValidDueDate(value: string): boolean {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return false;
    }

    const startDate = this.form.controls.startDate.value;
    if (!startDate) {
      return true;
    }

    return parsed >= new Date(startDate);
  }

  addTag(): void {
    const value = this.form.controls.tags.value?.trim() ?? "";

    if (!value) return;

    const exists = this.selectedTags().some(
      (tag) => tag.text.toLowerCase() === value.toLowerCase(),
    );

    if (exists) {
      return;
    }

    this.selectedTags.update((tags) => [
      ...tags,
      {
        id: nanoid(),
        text: value,
        color: this.color(),
      },
    ]);

    this.form.controls.tags.setValue("");
  }

  onTagEnter(event: Event): void {
    event.preventDefault();

    this.addTag();
  }

  removeTag(tagId: string): void {
    this.selectedTags.update((tags) => tags.filter((tag) => tag.id !== tagId));
  }

  alternateTagColor(tagId: string): void {
    this.selectedTags.update((tags) =>
      tags.map((tag) => {
        if (tag.id !== tagId) return tag;

        const colorIndex = ALL_COLORS.indexOf(tag.color);
        const nextColor = ALL_COLORS[(colorIndex + 1) % ALL_COLORS.length];

        return { ...tag, color: nextColor };
      }),
    );
  }

  onTagClick(tagId: string): void {
    this.alternateTagColor(tagId);
  }

  onDropTag(event: CdkDragDrop<Task["tags"], Task["tags"], string>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    this.selectedTags.update((prev) => {
      const result = [...prev];
      moveItemInArray(result, event.previousIndex, event.currentIndex);
      return result;
    });
  }

  onDragStarted(): void {
    document.body.classList.add("is-dragging");
  }

  onDragEnded(): void {
    document.body.classList.remove("is-dragging");
  }
}

const dateRangeValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const start = control.get("startDate");
  const due = control.get("dueDate");

  return start && due && start.value > due ? { dataRangeInvalid: true } : null;
};
