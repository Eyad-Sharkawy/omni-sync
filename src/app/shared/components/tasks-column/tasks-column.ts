import { ChangeDetectionStrategy, Component, input, numberAttribute, output } from "@angular/core";
import { OmniSyncColors } from "../../UI/colors";

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
  id = input.required<string>();
  numberOfTasks = input.required({ transform: numberAttribute });
  color = input.required<OmniSyncColors>();
  addTask = output<string>();

  onAddTask() {
    const columnID = this.id();

    this.addTask.emit(columnID);
  }
}
