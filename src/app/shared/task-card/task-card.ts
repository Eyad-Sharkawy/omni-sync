import {Component, input} from '@angular/core';

type Priority = "low" | "mid" | "high";

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
    mid: "bg-priority-mid",
    high: "bg-priority-high",
  };

  priorityTextClass: Record<Priority, string> = {
    low: "text-priority-low",
    mid: "text-priority-mid",
    high: "text-priority-high",
  };
}
