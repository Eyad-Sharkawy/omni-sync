import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { Auth as FireAuth } from "@angular/fire/auth";

import { UserProfileService } from "../services/user-profile/user-profile";
import { isProfileComplete } from "../models/user-profile";

/** Sends signed-in users with missing profile fields to `/profile`. Guests are unchanged. */
export const requireCompleteProfileGuard: CanActivateFn = async () => {
  const auth = inject(FireAuth);
  const router = inject(Router);
  const userProfile = inject(UserProfileService);

  await auth.authStateReady();

  const user = auth.currentUser;
  if (!user) {
    return true;
  }

  await userProfile.loadProfile(user.uid);

  if (isProfileComplete(userProfile.profile())) {
    return true;
  }

  return router.createUrlTree(["/profile"]);
};
