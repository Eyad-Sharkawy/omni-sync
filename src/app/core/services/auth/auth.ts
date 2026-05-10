import { inject, Injectable } from "@angular/core";
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

  async loginWithGoogle() {
    const provider = new GoogleAuthProvider();

    try {
      await signInWithPopup(this.auth, provider);
    } catch (error) {
      console.error("Login with google failed:", error);
    }
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
