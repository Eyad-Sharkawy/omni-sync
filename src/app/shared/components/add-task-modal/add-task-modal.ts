import { afterNextRender, Component, ElementRef, output, viewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "os-add-task-modal",
  imports: [FormsModule],
  templateUrl: "./add-task-modal.html",
  styleUrl: "./add-task-modal.css",
})
export class AddTaskModal {
  closed = output<void>();
  dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>("dialogElement");

  constructor() {
    afterNextRender(() => {
      this.dialogRef().nativeElement.showModal();
    });
  }

  closeModal() {
    this.dialogRef().nativeElement.close();

    this.closed.emit();
  }
}
