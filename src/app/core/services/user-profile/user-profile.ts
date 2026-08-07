import { effect, inject, Injectable, signal } from "@angular/core";
import { doc, Firestore, getDoc, serverTimestamp, writeBatch } from "@angular/fire/firestore";

import { Auth } from "../auth/auth";
import { UserProfile, isValidUsername, normalizeUsername } from "../../models/user-profile";

const USERS_COLLECTION = "users";
const USERNAMES_COLLECTION = "usernames";

@Injectable({
  providedIn: "root",
})
export class UserProfileService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);

  /** Live profile for signed-in user (null if guest or not loaded). */
  readonly profile = signal<UserProfile | null>(null);

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      if (!user) {
        this.profile.set(null);
        return;
      }
      void this.loadProfile(user.uid);
    });
  }

  async loadProfile(uid: string): Promise<UserProfile | null> {
    try {
      const snap = await getDoc(doc(this.firestore, USERS_COLLECTION, uid));
      if (!snap.exists()) {
        this.profile.set(null);
        return null;
      }
      const data = snap.data() as Partial<UserProfile>;
      const next: UserProfile = {
        uid,
        username: String(data.username ?? ""),
        firstName: String(data.firstName ?? ""),
        lastName: String(data.lastName ?? ""),
        updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
      };
      this.profile.set(next);
      return next;
    } catch {
      this.profile.set(null);
      return null;
    }
  }

  /**
   * Saves profile and claims username atomically via batch.
   * Returns an error message if username is taken or invalid.
   */
  async saveProfile(input: {
    username: string;
    firstName: string;
    lastName: string;
  }): Promise<{ ok: true } | { ok: false; message: string }> {
    const user = this.auth.currentUser();
    if (!user) {
      return { ok: false, message: "Sign in to save your profile." };
    }

    if (!isValidUsername(input.username)) {
      return {
        ok: false,
        message: "Username must be 3–24 characters: letters, numbers, or underscore (lowercase).",
      };
    }

    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();

    if (!firstName || !lastName) {
      return { ok: false, message: "First and last name are required." };
    }

    const normalized = normalizeUsername(input.username);
    const userRef = doc(this.firestore, USERS_COLLECTION, user.uid);
    const usernameRef = doc(this.firestore, USERNAMES_COLLECTION, normalized);
    const current = this.profile();

    try {
      const usernameSnap = await getDoc(usernameRef);
      if (usernameSnap.exists()) {
        const ownerUid = (usernameSnap.data() as { uid?: string })?.uid;
        if (ownerUid && ownerUid !== user.uid) {
          return { ok: false, message: "That username is already taken." };
        }
      }

      const batch = writeBatch(this.firestore);

      if (current?.username && normalizeUsername(current.username) !== normalized) {
        const oldUsernameRef = doc(
          this.firestore,
          USERNAMES_COLLECTION,
          normalizeUsername(current.username),
        );
        batch.delete(oldUsernameRef);
      }

      batch.set(usernameRef, { uid: user.uid });
      batch.set(userRef, {
        username: normalized,
        firstName,
        lastName,
        updatedAt: serverTimestamp(),
      });

      await batch.commit();

      const updated: UserProfile = {
        uid: user.uid,
        username: normalized,
        firstName,
        lastName,
      };
      this.profile.set(updated);
      return { ok: true };
    } catch {
      return { ok: false, message: "Could not save profile. Try again." };
    }
  }

  /** Read another user's public profile (for shared board labels). */
  async getPublicProfile(
    uid: string,
  ): Promise<{ username: string; firstName: string; lastName: string } | null> {
    try {
      const snap = await getDoc(doc(this.firestore, USERS_COLLECTION, uid));
      if (!snap.exists()) {
        return null;
      }
      const data = snap.data() as Partial<UserProfile>;
      return {
        username: String(data.username ?? ""),
        firstName: String(data.firstName ?? ""),
        lastName: String(data.lastName ?? ""),
      };
    } catch {
      return null;
    }
  }

  /** Returns Firebase uid for a claimed username, or null. */
  async getUidForUsername(rawUsername: string): Promise<string | null> {
    const key = normalizeUsername(rawUsername);
    if (!key) {
      return null;
    }
    try {
      const snap = await getDoc(doc(this.firestore, USERNAMES_COLLECTION, key));
      if (!snap.exists()) {
        return null;
      }
      const uid = (snap.data() as { uid?: string })?.uid;
      return typeof uid === "string" ? uid : null;
    } catch {
      return null;
    }
  }
}
