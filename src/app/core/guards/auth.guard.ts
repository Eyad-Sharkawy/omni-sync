import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { Auth as FireAuth } from "@angular/fire/auth";

export const requireAuthGuard: CanActivateFn = async () => {
  const auth = inject(FireAuth);
  const router = inject(Router);

  await auth.authStateReady();

  if (!auth.currentUser) {
    return router.createUrlTree(["/"]);
  }

  return true;
};
