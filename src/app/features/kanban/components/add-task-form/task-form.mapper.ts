import { CreateTaskInput } from "../../services/kanban-store";
import { TaskFormGroup } from "./task-form.factory";
import { Task } from "../../../../core/models/task";

export type TaskFormSubmitResult =
  | { ok: true; columnId: string; input: CreateTaskInput }
  | { ok: false; reason: "invalid" | "beforeStart" };

export function mapFormToSubmit(form: TaskFormGroup, tags: Task["tags"]): TaskFormSubmitResult {
  if (form.invalid) {
    return { ok: false, reason: "invalid" };
  }

  const { title, description, priority, startDate, dueDate, column } = form.getRawValue();

  if (!title?.trim() || !priority || !column || !startDate || !dueDate) {
    return { ok: false, reason: "invalid" };
  }

  const start = new Date(startDate);
  const due = new Date(dueDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(due.getTime())) {
    return { ok: false, reason: "invalid" };
  }

  if (due < start) {
    return { ok: false, reason: "beforeStart" };
  }

  return {
    ok: true,
    columnId: column,
    input: {
      title: title.trim(),
      description: description?.trim() || undefined,
      priority: priority,
      tags: tags,
      startDate: start,
      dueDate: due,
    },
  };
}
