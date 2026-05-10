export interface UserProfile {
  uid: string;
  /** Unique, normalized lowercase for lookups */
  username: string;
  firstName: string;
  lastName: string;
  updatedAt?: string;
}

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidUsername(raw: string): boolean {
  const s = normalizeUsername(raw);
  return /^[a-z0-9_]{3,24}$/.test(s);
}

export function profileInitials(profile: Pick<UserProfile, "firstName" | "lastName">): string {
  const f = profile.firstName?.trim().charAt(0) ?? "";
  const l = profile.lastName?.trim().charAt(0) ?? "";
  return (f + l).toUpperCase() || "?";
}

/** True when the user has saved a valid username plus non-empty first and last name. */
export function isProfileComplete(profile: UserProfile | null): boolean {
  if (!profile) {
    return false;
  }
  const first = profile.firstName?.trim() ?? "";
  const last = profile.lastName?.trim() ?? "";
  if (!first || !last) {
    return false;
  }
  return isValidUsername(profile.username);
}
