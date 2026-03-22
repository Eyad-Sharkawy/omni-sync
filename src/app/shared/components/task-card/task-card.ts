import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  contentChildren,
  input,
  output,
} from "@angular/core";
import { TaskTag } from "../task-tag/task-tag.component";
import { NgOptimizedImage } from "@angular/common";

type Priority = "low" | "medium" | "high";

@Component({
  selector: "os-task-card",
  imports: [NgOptimizedImage],
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
  taskTags = contentChildren(TaskTag);

  onEdit() {
    this.edit.emit();
  }

  onDelete() {
    this.delete.emit();
  }
}
