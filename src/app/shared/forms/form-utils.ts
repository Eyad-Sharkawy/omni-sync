import { AbstractControl } from "@angular/forms";

export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export function showControlError(control: AbstractControl): boolean {
  return control.invalid && control.touched && control.dirty;
}

/** @deprecated Use `showControlError` */
export const showContorlError = showControlError;
