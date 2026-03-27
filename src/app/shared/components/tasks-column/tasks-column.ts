import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  input,
  output,
} from "@angular/core";
import { CdkDragHandle } from "@angular/cdk/drag-drop";
import { CdkScrollable } from "@angular/cdk/scrolling";
import { OmniSyncColors } from "../../UI/colors";
import { TaskCard } from "../task-card/task-card";
import { NgOptimizedImage } from "@angular/common";

@Component({
  selector: "os-tasks-column",
  imports: [NgOptimizedImage, CdkDragHandle, CdkScrollable],
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
  delete = output();
  edit = output();
  addTask = output();

  onDelete() {
    this.delete.emit();
  }

  onEdit() {
    this.edit.emit();
  }

  onAddTask() {
    this.addTask.emit();
  }
}
