import { ChangeDetectionStrategy, Component, input } from "@angular/core";

type Priority = "low" | "medium" | "high";

@Component({
  selector: "os-task-card",
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./task-card.html",
  styleUrl: "./task-card.css",
  host: {
    "[style.--priority]": "'var(--color-priority-' + taskPriority() + ')'",
  },
})
export class TaskCard {
  taskPriority = input.required<Priority>();
}
