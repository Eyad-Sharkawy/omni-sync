import { ChangeDetectionStrategy, Component, contentChildren, input, output } from "@angular/core";
import { TaskTag } from "../task-tag/task-tag";
import { NgOptimizedImage } from "@angular/common";
import { CdkDragHandle } from "@angular/cdk/drag-drop";

type Priority = "low" | "medium" | "high";

@Component({
  selector: "os-task-card",
  imports: [NgOptimizedImage, CdkDragHandle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./task-card.html",
  styleUrl: "./task-card.css",
  host: {
    "[style.--priority]": "'var(--color-priority-' + taskPriority() + ')'",
  },
})
export class TaskCard {
  taskPriority = input.required<Priority>();
  edit = output();
  delete = output();
  expand = output();
  taskTags = contentChildren(TaskTag);

  onEdit() {
    this.edit.emit();
  }

  onDelete() {
    this.delete.emit();
  }

  onExpandClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest("button")) {
      return;
    }
    this.expand.emit();
  }

  onExpandKeydown(event: KeyboardEvent): void {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    this.expand.emit();
  }
}
