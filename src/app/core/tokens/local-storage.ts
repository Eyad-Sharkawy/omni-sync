import { InjectionToken } from "@angular/core";

export const LOCAL_STORAGE = new InjectionToken("Local Storage", {
  providedIn: "root",
  factory: () => (typeof window !== "undefined" ? window.localStorage : ({} as Storage)),
});
