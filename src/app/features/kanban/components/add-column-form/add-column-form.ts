import { Component, effect, inject, input, output } from "@angular/core";
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

import { ALL_COLORS, OmniSyncColors } from "../../../../shared/UI/colors";
import { KanbanStore } from "../../services/kanban-store";

@Component({
  selector: "os-add-column-form",
  imports: [FormsModule, ReactiveFormsModule],
  templateUrl: "./add-column-form.html",
  styleUrl: "./add-column-form.css",
})
export class AddColumnForm {
  private readonly kanbanStore = inject(KanbanStore);

  readonly selectedColumnInfo = input<{ columnId: string } | null>(null);

  protected readonly colorOptions = ALL_COLORS;
  colorChange = output<OmniSyncColors>();
  closed = output();

  protected form = new FormGroup({
    header: new FormControl("", {
      validators: [Validators.required],
    }),
    color: new FormControl<OmniSyncColors>("zinc", {
      validators: [Validators.required],
    }),
  });

  get headerIsInvalid(): boolean {
    const header = this.form.controls.header;

    return header.invalid && header.touched && header.dirty;
  }

  get colorIsInvalid(): boolean {
    const color = this.form.controls.color;

    return color.invalid && color.touched && color.dirty;
  }

  get isEditMode(): boolean {
    return !!this.selectedColumnInfo();
  }

  constructor() {
    effect(() => {
      const selectedColumnInfo = this.selectedColumnInfo();

      if (!selectedColumnInfo) {
        this.form.reset({ header: "", color: "zinc" });
        return;
      }

      const column = this.kanbanStore.getColumnById(selectedColumnInfo.columnId);
      if (!column) {
        return;
      }

      this.form.reset({ header: column.header, color: column.color });
      this.form.markAsPristine();
      this.form.markAsUntouched();
    });

    this.form.controls.color.valueChanges.pipe(takeUntilDestroyed()).subscribe((color) => {
      if (color) {
        this.emitColorChange(color);
      }
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.form.markAllAsDirty();
      return;
    }

    const { header, color } = this.form.getRawValue();

    if (!header || !color) {
      return;
    }

    const selectedColumnInfo = this.selectedColumnInfo();

    if (selectedColumnInfo) {
      this.kanbanStore.updateColumn(selectedColumnInfo.columnId, { header, color });
    } else {
      this.kanbanStore.addColumn({ header, color });
    }

    this.onModalClosed();
  }

  onModalClosed() {
    this.closed.emit();
  }

  private emitColorChange(newColor: OmniSyncColors) {
    this.colorChange.emit(newColor);
  }
}
