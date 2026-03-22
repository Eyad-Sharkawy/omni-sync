import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  OnInit,
  output,
  signal,
  viewChild,
} from "@angular/core";
import {
  AbstractControl,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from "@angular/forms";

import { KanbanStore } from "../../../features/kanban/services/kanban-store";
import { ALL_COLORS, OmniSyncColors } from "../../UI/colors";
import { Task } from "../../../core/models/task";
import { TaskTag } from "../task-tag/task-tag";
import { generateId } from "../../functions/generate-id";
import { toSignal } from "@angular/core/rxjs-interop";

@Component({
  selector: "os-add-task-modal",
  imports: [FormsModule, ReactiveFormsModule, TaskTag],
  templateUrl: "./add-task-modal.html",
  styleUrl: "./add-task-modal.css",
  host: {
    "[style.--color]": "'var(--color-os-' + color() + ')'",
  },
})
export class AddTaskModal implements OnInit {
  private readonly kanbanStore = inject(KanbanStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>("dialogElement");
  private readonly submitBtnRef =
    viewChild.required<ElementRef<HTMLDialogElement>>("submitBtnElement");
  readonly initialInfo = input.required<{ columnId?: string; taskId?: string }>();
  readonly closed = output<void>();

  readonly columns = this.kanbanStore.columns;
  readonly selectedColumn = signal(this.columns()[0]);
  readonly selectedTags = signal<Task["tags"]>([]);
  readonly color = computed<OmniSyncColors>(() => {
    return this.selectedColumn().color;
  });

  protected addTaskForm = new FormGroup(
    {
      title: new FormControl("", {
        validators: [Validators.required],
      }),
      priority: new FormControl<"low" | "medium" | "high" | null>(null, {
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

  readonly minDueDate = toSignal(this.addTaskForm.controls.startDate.valueChanges, {
    initialValue: new Date().toISOString().split("T")[0],
  });

  get titleIsInvalid(): boolean {
    const title = this.addTaskForm.controls.title;
    return title.invalid && title.touched && title.dirty;
  }

  get priorityIsInvalid(): boolean {
    const priority = this.addTaskForm.controls.priority;
    return priority.invalid && priority.touched && priority.dirty;
  }

  get columnIsInvalid(): boolean {
    const column = this.addTaskForm.controls.column;
    return column.invalid && column.touched && column.dirty;
  }

  get startDateIsInvalid(): boolean {
    const startDate = this.addTaskForm.controls.startDate;
    return startDate.invalid && startDate.touched && startDate.dirty;
  }

  get dueDateIsInvalid(): boolean {
    const dueDate = this.addTaskForm.controls.dueDate;
    return dueDate.invalid && dueDate.touched && dueDate.dirty;
  }

  constructor() {
    afterNextRender(() => {
      this.dialogRef().nativeElement.showModal();

      const selectedCol = this.columns().find(
        (column) => this.initialInfo().columnId === column.id,
      );

      if (selectedCol) {
        this.selectedColumn.set(selectedCol);
      }

      const selectedTask = this.selectedColumn().tasks.find(
        (task) => this.initialInfo().taskId === task.id,
      );

      if (selectedTask) {
        this.selectedTags.set(selectedTask.tags);

        const controls = this.addTaskForm.controls;

        controls.title.setValue(selectedTask.title);
        controls.priority.setValue(selectedTask.priority);
        controls.column.disable();
        controls.startDate.setValue(selectedTask.startDate.toISOString().split("T")[0]);
        controls.dueDate.setValue(selectedTask.dueDate.toISOString().split("T")[0]);

        this.submitBtnRef().nativeElement.innerText = "Edit Task";
      }

      this.addTaskForm.controls.column.setValue(this.selectedColumn().id);
    });
  }

  ngOnInit() {
    const subscription = this.addTaskForm.controls.column.valueChanges.subscribe((value) => {
      if (value) {
        const column = this.kanbanStore.getColumnById(value);

        if (column) {
          this.selectedColumn.set(column);
        }
      }
    });

    this.destroyRef.onDestroy(() => {
      subscription.unsubscribe();
    });
  }

  onClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.dialogRef().nativeElement.close();
    }
  }

  onDialogClosed() {
    this.closed.emit();
  }

  onSubmit() {
    if (this.addTaskForm.invalid) {
      this.addTaskForm.markAllAsTouched();
      this.addTaskForm.markAllAsDirty();
      return;
    }

    const { title, priority, column, startDate, dueDate } = this.addTaskForm.getRawValue();

    if (!title || !priority || !column || !startDate || !dueDate) {
      return;
    }

    const start = new Date(startDate);
    const due = new Date(dueDate);

    if (due < start) {
      this.addTaskForm.controls.dueDate.setErrors({ beforeStart: true });
      return;
    }

    const taskId = this.initialInfo().taskId;

    if (taskId && this.selectedColumn().tasks.some((task) => task.id === taskId)) {
      this.kanbanStore.updateTask(this.selectedColumn().id, taskId, {
        title: title.trim(),
        priority: priority,
        startDate: start,
        dueDate: due,
        tags: this.selectedTags(),
      });
    } else {
      this.kanbanStore.addTask(column, {
        title: title.trim(),
        priority: priority,
        startDate: start,
        dueDate: due,
        tags: this.selectedTags(),
      });
    }

    this.onDialogClosed();
  }

  addTag(): void {
    const value = this.addTaskForm.controls.tags.value?.trim() ?? "";

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
        id: generateId(),
        text: value,
        color: this.color(),
      },
    ]);

    this.addTaskForm.controls.tags.setValue("");
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
}

const dateRangeValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const start = control.get("startDate");
  const due = control.get("dueDate");

  return start && due && start.value > due ? { dataRangeInvalid: true } : null;
};
