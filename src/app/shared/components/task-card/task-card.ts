import {Component, input} from '@angular/core';

type Priority = "low" | "medium" | "high";

@Component({
  selector: 'os-task-card',
  imports: [],
  templateUrl: './task-card.html',
  styleUrl: './task-card.css',
})
export class TaskCard {
  taskPriority = input.required<Priority>();

  priorityBgClass: Record<Priority, string> =  {
    low: "bg-priority-low",
    medium: "bg-priority-medium",
    high: "bg-priority-high",
  };

  priorityTextClass: Record<Priority, string> = {
    low: "text-priority-low",
    medium: "text-priority-medium",
    high: "text-priority-high",
  };
}
