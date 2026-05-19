import { TaskFormGroup } from "./task-form.factory";
import { Task } from "../../../../core/models/task";

export function patchFormFromTask(form: TaskFormGroup, task: Task): void {
  form.patchValue({
    title: task.title,
    description: task.description ?? "",
    priority: task.priority,
    column: task.columnId,
    startDate: task.startDate.toISOString().split("T")[0],
    dueDate: task.dueDate.toISOString().split("T")[0],
  });
}
