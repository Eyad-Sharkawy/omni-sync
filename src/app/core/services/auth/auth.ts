import { inject, Injectable } from "@angular/core";
import { isSignInWithEmailLink, signInWithEmailLink, signInWithRedirect } from "firebase/auth";
import { toSignal } from "@angular/core/rxjs-interop";
import { map } from "rxjs";

import {
  ActionCodeSettings,
  authState,
  Auth as FireAuth,
  GoogleAuthProvider,
  sendSignInLinkToEmail,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
} from "@angular/fire/auth";

@Injectable({
  providedIn: "root",
})
export class Auth {
  private static readonly EMAIL_LINK_STORAGE_KEY = "os-email-link-signin-email";
  private readonly auth = inject(FireAuth);

  currentUser = toSignal(
    authState(this.auth).pipe(
      map((user) => {
        if (!user) {
          return null;
        }

        const isEmailPasswordUser = user.providerData.some(
          (provider) => provider.providerId === "password",
        );

        if (isEmailPasswordUser && !user.emailVerified) {
          return null;
        }

        return user;
      }),
    ),
    { initialValue: null },
  );

  constructor() {
    void this.tryCompleteEmailLinkSignIn();
  }

  /**
   * Finishes email-link sign-in when the user opens the magic link on this device.
   * Required by Firebase; without this, the link loads the app but never completes auth.
   */
  private async tryCompleteEmailLinkSignIn(): Promise<void> {
    if (typeof globalThis.window === "undefined") {
      return;
    }

    const href = globalThis.window.location.href;

    if (!isSignInWithEmailLink(this.auth, href)) {
      return;
    }

    let email = globalThis.localStorage?.getItem(Auth.EMAIL_LINK_STORAGE_KEY)?.trim() ?? "";

    if (!email) {
      email =
        globalThis.window
          .prompt("Confirm your email to finish signing in (same address the link was sent to).")
          ?.trim() ?? "";
    }

    if (!email) {
      console.warn("Email link sign-in cancelled: no email available.");
      return;
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
    if (!emailOk) {
      console.warn("Email link sign-in: invalid stored email format.");
      return;
    }

    try {
      await signInWithEmailLink(this.auth, email, href);
      globalThis.localStorage?.removeItem(Auth.EMAIL_LINK_STORAGE_KEY);

      const url = new URL(globalThis.window.location.href);
      url.search = "";
      globalThis.history?.replaceState({}, "", `${url.pathname}${url.hash}`);
    } catch (error) {
      console.error("Email link sign-in failed:", error);
    }
  }

  /**
   * Original working pattern (`194d06b`): **popup first**, then **redirect** if the popup is
   * blocked or cancelled. Return trip is completed via `getRedirectResult` in `app.config.ts`.
   */
  async loginWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();

    try {
      await signInWithPopup(this.auth, provider);
    } catch (error: unknown) {
      const code = Auth.authErrorCode(error);
      if (code === "auth/popup-blocked" || code === "auth/cancelled-popup-request") {
        await signInWithRedirect(this.auth, provider);
        throw { code: "auth/redirect-started" };
      }
      console.error("Login with google failed:", error);
      throw error;
    }
  }

  private static authErrorCode(error: unknown): string {
    if (error && typeof error === "object" && "code" in error) {
      const c = (error as { code?: unknown }).code;
      return typeof c === "string" ? c : "";
    }
    return "";
  }

  async logout() {
    try {
      await signOut(this.auth);
    } catch (error) {
      console.error("Logout Failed:", error);
      throw error;
    }
  }

  async signInWithEmail(email: string, password: string) {
    try {
      const credential = await createUserWithEmailAndPassword(this.auth, email, password);
      await sendEmailVerification(credential.user, this.getActionCodeSettings());
      await signOut(this.auth);
    } catch (error) {
      console.error("Registration Error", error);
      throw error;
    }
  }

  async loginWithEmail(email: string, password: string) {
    try {
      const credential = await signInWithEmailAndPassword(this.auth, email, password);

      if (!credential.user.emailVerified) {
        await sendEmailVerification(credential.user, this.getActionCodeSettings());
        await signOut(this.auth);
        throw { code: "auth/email-not-verified" };
      }
    } catch (error) {
      console.error("Email Sign In Error", error);
      throw error;
    }
  }

  async sendPasswordReset(email: string) {
    try {
      await sendPasswordResetEmail(this.auth, email, this.getActionCodeSettings());
    } catch (error) {
      console.error("Password Reset Error", error);
      throw error;
    }
  }

  async sendEmailLinkSignIn(email: string): Promise<void> {
    try {
      await sendSignInLinkToEmail(this.auth, email, this.getEmailLinkActionCodeSettings());
      globalThis.localStorage?.setItem(Auth.EMAIL_LINK_STORAGE_KEY, email);
    } catch (error) {
      console.error("Email Link Send Error", error);
      throw error;
    }
  }

  private getActionCodeSettings(): ActionCodeSettings | undefined {
    const origin = globalThis.location?.origin;
    if (!origin) {
      return undefined;
    }

    return {
      url: origin,
      handleCodeInApp: false,
    };
  }

  private getEmailLinkActionCodeSettings(): ActionCodeSettings {
    const origin = globalThis.location?.origin ?? "";
    return {
      url: `${origin}/`,
      handleCodeInApp: true,
    };
  }
}
