import { Component, inject, output, signal } from "@angular/core";
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from "@angular/forms";
import { FirebaseError } from "firebase/app";

import { Modal } from "../../../../shared/components/modal/modal";
import { Auth } from "../../../../core/services/auth/auth";

@Component({
  selector: "os-login-popup",
  imports: [Modal, ReactiveFormsModule],
  templateUrl: "./login-popup.html",
  styleUrl: "./login-popup.css",
})
export class LoginPopup {
  private static readonly EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  private static readonly PASSWORD_PATTERN =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
  private static readonly UPPERCASE_PATTERN = /[A-Z]/;
  private static readonly LOWERCASE_PATTERN = /[a-z]/;
  private static readonly NUMBER_PATTERN = /\d/;
  private static readonly SPECIAL_CHAR_PATTERN = /[^A-Za-z\d]/;

  private readonly auth = inject(Auth);
  private readonly formBuilder = inject(FormBuilder);

  readonly closed = output<void>();
  readonly isSubmitting = signal(false);
  readonly mode = signal<"login" | "signup">("login");
  readonly errorMessage = signal("");
  readonly successMessage = signal("");
  readonly isPasswordVisible = signal(false);
  readonly isConfirmPasswordVisible = signal(false);
  readonly authForm = this.formBuilder.nonNullable.group(
    {
      email: [
        "",
        [Validators.required, Validators.email, Validators.pattern(LoginPopup.EMAIL_PATTERN)],
      ],
      password: ["", [Validators.required]],
      confirmPassword: [""],
    },
    {
      validators: [this.confirmPasswordMatchesValidator()],
    },
  );

  setMode(mode: "login" | "signup"): void {
    this.mode.set(mode);
    this.errorMessage.set("");
    this.successMessage.set("");
    this.isPasswordVisible.set(false);
    this.isConfirmPasswordVisible.set(false);
    const passwordControl = this.authForm.controls.password;
    const confirmPasswordControl = this.authForm.controls.confirmPassword;

    if (mode === "signup") {
      passwordControl.setValidators([
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(LoginPopup.PASSWORD_PATTERN),
      ]);
      confirmPasswordControl.addValidators([Validators.required]);
    } else {
      passwordControl.setValidators([Validators.required]);
      confirmPasswordControl.clearValidators();
      confirmPasswordControl.setValue("");
    }

    passwordControl.updateValueAndValidity();
    confirmPasswordControl.updateValueAndValidity();
    this.authForm.updateValueAndValidity();
  }

  togglePasswordVisibility(): void {
    this.isPasswordVisible.update((value) => !value);
  }

  toggleConfirmPasswordVisibility(): void {
    this.isConfirmPasswordVisible.update((value) => !value);
  }

  async signInWithGoogle(): Promise<void> {
    if (this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set("");
    this.successMessage.set("");
    try {
      await this.auth.loginWithGoogle();
      this.closed.emit();
    } catch (error) {
      this.errorMessage.set(this.resolveAuthError(error));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async submitWithEmail(): Promise<void> {
    if (this.isSubmitting()) {
      return;
    }

    if (this.authForm.invalid) {
      this.authForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set("");
    this.successMessage.set("");

    const { email, password } = this.authForm.getRawValue();
    try {
      if (this.mode() === "signup") {
        await this.auth.signInWithEmail(email, password);
        this.successMessage.set(
          "Account created. Verification email sent. Verify your email before logging in.",
        );
        return;
      } else {
        await this.auth.loginWithEmail(email, password);
      }
      this.closed.emit();
    } catch (error) {
      this.errorMessage.set(this.resolveAuthError(error));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async forgotPassword(): Promise<void> {
    if (this.isSubmitting()) {
      return;
    }

    const emailControl = this.authForm.controls.email;
    emailControl.markAsTouched();
    emailControl.updateValueAndValidity();

    if (emailControl.invalid) {
      this.errorMessage.set("Enter a valid email first, then try reset password.");
      this.successMessage.set("");
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set("");
    this.successMessage.set("");
    try {
      await this.auth.sendPasswordReset(emailControl.value);
      this.successMessage.set("Password reset email sent. Check your inbox.");
    } catch (error) {
      this.errorMessage.set(this.resolveAuthError(error));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async sendMagicLink(): Promise<void> {
    if (this.isSubmitting()) {
      return;
    }

    const emailControl = this.authForm.controls.email;
    emailControl.markAsTouched();
    emailControl.updateValueAndValidity();

    if (emailControl.invalid) {
      this.errorMessage.set("Enter a valid email first, then send the sign-in link.");
      this.successMessage.set("");
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set("");
    this.successMessage.set("");
    try {
      await this.auth.sendEmailLinkSignIn(emailControl.value);
      this.successMessage.set("Magic link sent. Check your email and open the link on this device.");
    } catch (error) {
      this.errorMessage.set(this.resolveAuthError(error));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  get emailErrors(): string[] {
    const control = this.authForm.controls.email;
    if (!control.touched || !control.errors) {
      return [];
    }

    const errors: string[] = [];
    if (control.errors["required"]) {
      errors.push("Email is required.");
    }
    if (control.errors["email"] || control.errors["pattern"]) {
      errors.push("Enter a valid email address (example: name@example.com).");
    }

    return errors;
  }

  get passwordErrors(): string[] {
    const control = this.authForm.controls.password;
    if (!control.touched || !control.errors) {
      return [];
    }

    const errors: string[] = [];
    const passwordValue = control.value ?? "";

    if (control.errors["required"]) {
      errors.push("Password is required.");
    }
    if (this.mode() !== "signup") {
      return errors;
    }
    if (passwordValue.length > 0 && passwordValue.length < 8) {
      errors.push("Password must be at least 8 characters.");
    }
    if (passwordValue.length > 0 && !LoginPopup.UPPERCASE_PATTERN.test(passwordValue)) {
      errors.push("Password must include at least one uppercase letter.");
    }
    if (passwordValue.length > 0 && !LoginPopup.LOWERCASE_PATTERN.test(passwordValue)) {
      errors.push("Password must include at least one lowercase letter.");
    }
    if (passwordValue.length > 0 && !LoginPopup.NUMBER_PATTERN.test(passwordValue)) {
      errors.push("Password must include at least one number.");
    }
    if (passwordValue.length > 0 && !LoginPopup.SPECIAL_CHAR_PATTERN.test(passwordValue)) {
      errors.push("Password must include at least one special character.");
    }

    return errors;
  }

  get confirmPasswordErrors(): string[] {
    if (this.mode() !== "signup") {
      return [];
    }

    const control = this.authForm.controls.confirmPassword;
    if (!control.touched) {
      return [];
    }

    const errors: string[] = [];
    if (control.errors?.["required"]) {
      errors.push("Please confirm your password.");
    }
    if (this.authForm.errors?.["passwordMismatch"]) {
      errors.push("Passwords do not match.");
    }

    return errors;
  }

  private resolveAuthError(error: unknown): string {
    const errorCode = this.extractAuthErrorCode(error);
    if (!errorCode) {
      return "Authentication failed. Please try again.";
    }

    switch (errorCode) {
      case "auth/email-already-in-use":
        return "This email is already registered.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/invalid-credential":
      case "auth/user-not-found":
      case "auth/wrong-password":
        return "Incorrect email or password.";
      case "auth/email-not-verified":
        return "Email not verified. We sent a new verification email.";
      case "auth/redirect-started":
        return "Redirecting to Google sign-in...";
      case "auth/missing-email":
        return "Please enter your email address.";
      case "auth/user-disabled":
        return "This account is disabled.";
      case "auth/invalid-login-credentials":
        return "Incorrect email or password.";
      case "auth/weak-password":
        return "Password is too weak. Use at least 8 characters with mixed types.";
      case "auth/too-many-requests":
        return "Too many attempts. Please wait and try again.";
      case "auth/network-request-failed":
        return "Network error. Check your connection and try again.";
      case "auth/quota-exceeded":
        return "Email sending quota exceeded. Try again later.";
      case "auth/operation-not-allowed":
        return "Email/password auth is disabled in Firebase Sign-in method.";
      case "auth/missing-email-for-link-signin":
        return "Couldn't complete link sign-in: original email not found on this device.";
      case "auth/unauthorized-continue-uri":
      case "auth/invalid-continue-uri":
      case "auth/missing-continue-uri":
        return "Continue URL is invalid or not authorized in Firebase Authentication settings.";
      case "permission-denied":
        return "You're signed in, but your account doesn't have permission to access some data yet.";
      case "unauthenticated":
        return "You're not authorized to access this data. Please sign in again.";
      default:
        return `Authentication failed (${errorCode}). Check Firebase Auth settings and authorized domains.`;
    }
  }

  private extractAuthErrorCode(error: unknown): string | null {
    if (error instanceof FirebaseError) {
      return error.code;
    }

    if (typeof error === "object" && error !== null && "code" in error) {
      const maybeCode = (error as { code?: unknown }).code;
      if (typeof maybeCode === "string") {
        return maybeCode;
      }
    }

    return null;
  }

  private confirmPasswordMatchesValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      if (this.mode() !== "signup") {
        return null;
      }

      const password = group.get("password")?.value;
      const confirmPassword = group.get("confirmPassword")?.value;

      if (!confirmPassword || password === confirmPassword) {
        return null;
      }

      return { passwordMismatch: true };
    };
  }
}
