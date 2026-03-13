import {Component, input} from '@angular/core';

type columnTypes = "todo" | "inprog" | "review" | "done";

@Component({
  selector: 'os-tasks-column',
  imports: [],
  templateUrl: './tasks-column.html',
  styleUrl: './tasks-column.css',
  host: {
    class: "relative flex flex-col gap-0 bg-surface border-border border-1 rounded-xl before:absolute before:top-0 before:left-0 before:h-[3px] before:w-full before:rounded-t-xl",
    "[class]": "'before:bg-' + columnType()"
  }
})
export class TasksColumn {
  columnType = input.required<columnTypes>()
}
