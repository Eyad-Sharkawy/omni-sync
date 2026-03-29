import { ChangeDetectionStrategy, Component, effect, inject, input, output } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";

import { KanbanStore } from "../../services/kanban-store";

@Component({
  selector: "os-create-board-form",
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./create-board-form.html",
  styleUrl: "./create-board-form.css",
})
export class CreateBoardForm {
  private readonly kanbanStore = inject(KanbanStore);

  readonly selectedBoardId = input<string | null>(null);
  readonly closed = output<void>();
  readonly created = output<string>();

  protected form = new FormGroup({
    name: new FormControl("", {
      validators: [Validators.required],
    }),
    startDate: new FormControl(new Date().toISOString().split("T")[0], {
      validators: [Validators.required],
    }),
    dueDate: new FormControl("", {
      validators: [Validators.required],
    }),
  });

  readonly minDueDate = toSignal(this.form.controls.startDate.valueChanges, {
    initialValue: new Date().toISOString().split("T")[0],
  });

  get isEditMode(): boolean {
    return !!this.selectedBoardId();
  }

  get nameIsInvalid(): boolean {
    const name = this.form.controls.name;
    return name.invalid && name.touched && name.dirty;
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
    effect(() => {
      const boardId = this.selectedBoardId();

      if (!boardId) {
        this.form.reset({
          name: "",
          startDate: new Date().toISOString().split("T")[0],
          dueDate: "",
        });
        this.form.markAsPristine();
        this.form.markAsUntouched();
        return;
      }

      const board = this.kanbanStore.getBoardById(boardId);
      if (!board) {
        return;
      }

      this.form.reset({
        name: board.name,
        startDate: board.startDate.toISOString().split("T")[0],
        dueDate: board.dueDate.toISOString().split("T")[0],
      });
      this.form.markAsPristine();
      this.form.markAsUntouched();
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.form.markAllAsDirty();
      return;
    }

    const { name, startDate, dueDate } = this.form.getRawValue();

    if (!name || !startDate || !dueDate) {
      return;
    }

    const cleanName = name.trim();
    if (!cleanName) {
      this.form.controls.name.setErrors({ required: true });
      this.form.controls.name.markAsTouched();
      this.form.controls.name.markAsDirty();
      return;
    }

    const start = new Date(startDate);
    const due = new Date(dueDate);

    if (due < start) {
      this.form.controls.dueDate.setErrors({ beforeStart: true });
      this.form.controls.dueDate.markAsTouched();
      this.form.controls.dueDate.markAsDirty();
      return;
    }

    const boardId = this.selectedBoardId();
    if (boardId) {
      this.kanbanStore.updateBoard(boardId, {
        name: cleanName,
        startDate: start,
        dueDate: due,
      });
    } else {
      const newBoardId = this.kanbanStore.addBoard({
        name: cleanName,
        startDate: start,
        dueDate: due,
      });
      this.created.emit(newBoardId);
    }

    this.onModalClosed();
  }

  onModalClosed(): void {
    this.closed.emit();
  }
}
