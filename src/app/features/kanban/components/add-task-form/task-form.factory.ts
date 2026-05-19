import { FormControl, FormGroup, Validators } from "@angular/forms";

import { dateRangeValidator } from "../../../../shared/forms/form-validators";
import { todayISO } from "../../../../shared/forms/form-utils";

type PriorityControl = FormControl<"low" | "medium" | "high">;

export interface TaskFormControls {
  title: FormControl<string>;
  description: FormControl<string>;
  priority: PriorityControl;
  column: FormControl<string>;
  tags: FormControl<string>;
  startDate: FormControl<string>;
  dueDate: FormControl<string>;
}

export type TaskFormGroup = FormGroup<TaskFormControls>;

export function createTaskForm(): TaskFormGroup {
  return new FormGroup(
    {
      title: createTitleControl(),
      description: createDescriptionControl(),
      priority: createPriorityControl(),
      column: createColumnControl(),
      tags: createTagsControl(),
      startDate: createStartDate(),
      dueDate: createDueDate(),
    },
    { validators: dateRangeValidator },
  );
}

function createTitleControl(): FormControl<string> {
  return new FormControl("", { nonNullable: true, validators: [Validators.required] });
}

function createDescriptionControl(): FormControl<string> {
  return new FormControl("", { nonNullable: true });
}

function createPriorityControl(): PriorityControl {
  return new FormControl("medium", { nonNullable: true, validators: [Validators.required] });
}

function createColumnControl(): FormControl<string> {
  return new FormControl("", { nonNullable: true, validators: [Validators.required] });
}

function createTagsControl(): FormControl<string> {
  return new FormControl("", { nonNullable: true });
}

function createStartDate(): FormControl<string> {
  return new FormControl(todayISO(), { nonNullable: true, validators: [Validators.required] });
}

function createDueDate(): FormControl<string> {
  return new FormControl("", { nonNullable: true, validators: [Validators.required] });
}
