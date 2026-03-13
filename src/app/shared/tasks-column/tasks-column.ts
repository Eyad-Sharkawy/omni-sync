import {Component, input} from '@angular/core';

type columnTypes = "todo" | "inprog" | "review" | "done";

@Component({
  selector: 'os-tasks-column',
  imports: [],
  templateUrl: './tasks-column.html',
  styleUrl: './tasks-column.css',
  host: {
    "[class]": "'before:bg-' + columnType()"
  }
})
export class TasksColumn {
  columnType = input.required<columnTypes>()
}
