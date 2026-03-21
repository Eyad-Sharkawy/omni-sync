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
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";

import { KanbanStore } from "../../../features/kanban/services/kanban-store";
import { OmniSyncColors } from "../../UI/colors";

@Component({
  selector: "os-add-task-modal",
  imports: [FormsModule, ReactiveFormsModule],
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
  readonly initialSelectedColumnId = input.required<string>();
  readonly closed = output<void>();

  columns = this.kanbanStore.columns;
  selectedColumn = signal(this.columns()[0]);
  color = computed<OmniSyncColors>(() => {
    return this.selectedColumn().color;
  });

  protected addTaskForm = new FormGroup({
    title: new FormControl("", {
      validators: [Validators.required],
    }),
    priority: new FormControl(null, Validators.required),
    column: new FormControl("", Validators.required),
    metaTags: new FormControl(""),
    startDate: new FormControl("", Validators.required),
    dueDate: new FormControl("", Validators.required),
  });

  constructor() {
    afterNextRender(() => {
      this.dialogRef().nativeElement.showModal();

      const selectedCol = this.columns().find(
        (column) => this.initialSelectedColumnId() === column.id,
      );

      if (selectedCol) {
        this.selectedColumn.set(selectedCol);
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
    console.log("submit");
  }
}
