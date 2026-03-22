import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  input,
  output,
} from "@angular/core";
import { OmniSyncColors } from "../../UI/colors";
import { TaskCard } from "../task-card/task-card";

@Component({
  selector: "os-tasks-column",
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./tasks-column.html",
  styleUrl: "./tasks-column.css",
  host: {
    "[style.--color]": "'var(--color-os-' + color() + ')'",
  },
})
export class TasksColumn {
  taskCards = contentChildren(TaskCard);
  numberOfTasks = computed(() => this.taskCards().length);
  color = input.required<OmniSyncColors>();
  addTask = output();

  onAddTask() {
    this.addTask.emit();
  }
}
