import { Component, effect, inject, signal } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";

import { UserProfileService } from "../../core/services/user-profile/user-profile";
import { isValidUsername } from "../../core/models/user-profile";

@Component({
  selector: "os-profile",
  imports: [ReactiveFormsModule],
  templateUrl: "./profile.html",
  styleUrl: "./profile.css",
})
export class ProfilePage {
  private readonly userProfile = inject(UserProfileService);

  readonly saveError = signal<string | null>(null);
  readonly saveOk = signal(false);

  readonly form = new FormGroup({
    username: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    firstName: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
    lastName: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
  });

  private profileFormSynced = false;

  constructor() {
    effect(() => {
      const p = this.userProfile.profile();
      if (!p || this.profileFormSynced) {
        return;
      }
      this.form.patchValue(
        {
          username: p.username,
          firstName: p.firstName,
          lastName: p.lastName,
        },
        { emitEvent: false },
      );
      this.profileFormSynced = true;
    });
  }

  async onSubmit(): Promise<void> {
    this.saveError.set(null);
    this.saveOk.set(false);

    const { username, firstName, lastName } = this.form.getRawValue();
    if (!isValidUsername(username)) {
      this.saveError.set(
        "Username must be 3–24 characters: lowercase letters, numbers, or underscores only.",
      );
      return;
    }

    const result = await this.userProfile.saveProfile({ username, firstName, lastName });
    if (result.ok) {
      this.saveOk.set(true);
    } else {
      this.saveError.set(result.message);
    }
  }
}
