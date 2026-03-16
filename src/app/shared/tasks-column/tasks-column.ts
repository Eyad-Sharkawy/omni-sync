import {Component, computed, input, numberAttribute} from '@angular/core';

type columnTypes = "todo" | "inprog" | "review" | "done";

@Component({
  selector: 'os-tasks-column',
  imports: [],
  templateUrl: './tasks-column.html',
  styleUrl: './tasks-column.css',
  host: {
    "[class]": "hostClass()"
  }
})
export class TasksColumn {
  numberOfTasks = input.required({transform: numberAttribute});
  columnType = input.required<columnTypes>()

  protected hostClass = computed(() => {
    const type = this.columnType();

    const classes: Record<columnTypes, string> = {
      todo: "before:bg-todo",
      inprog: "before:bg-inprog",
      review: "before:bg-review",
      done: "before:bg-done",
    };

    return classes[type];
  });

  headerSpanClasses: Record<columnTypes, string> = {
    todo: "bg-todo shadow-todo",
    inprog: "bg-inprog shadow-inprog",
    review: "bg-review shadow-review",
    done: "bg-done shadow-done",
  }
}
