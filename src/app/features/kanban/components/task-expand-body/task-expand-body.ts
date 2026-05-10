import { DatePipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";

import { Task } from "../../../../core/models/task";
import { TaskTag } from "../task-tag/task-tag";

@Component({
  selector: "os-task-expand-body",
  imports: [DatePipe, TaskTag],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./task-expand-body.html",
  styleUrl: "./task-expand-body.css",
  host: {
    "[style.--priority]": "'var(--color-priority-' + task().priority + ')'",
  },
})
export class TaskExpandBody {
  readonly task = input.required<Task>();

  readonly edit = output<void>();

  onEdit(): void {
    this.edit.emit();
  }
}
