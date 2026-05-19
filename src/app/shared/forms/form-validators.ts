import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";

export const dateRangeValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const start = control.get("startDate");
  const due = control.get("dueDate");

  return start && due && start.value > due ? { dataRangeInvalid: true } : null;
};
