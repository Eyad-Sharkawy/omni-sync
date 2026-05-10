import { Component, computed, effect, inject, signal, untracked } from "@angular/core";
import { NavigationEnd, Router, RouterOutlet } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";
import { BreakpointObserver, Breakpoints } from "@angular/cdk/layout";
import { filter, map } from "rxjs";

import { Navbar } from "./layout/navbar/navbar";
import { Sidebar } from "./layout/sidebar/sidebar";
import { Auth } from "./core/services/auth/auth";
import { UserProfileService } from "./core/services/user-profile/user-profile";
import { isProfileComplete } from "./core/models/user-profile";

@Component({
  selector: "os-root",
  imports: [Navbar, RouterOutlet, Sidebar],
  templateUrl: "./app.html",
  styleUrl: "./app.css",
})
export class App {
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);
  private readonly userProfile = inject(UserProfileService);
  private readonly breakPointObserver = inject(BreakpointObserver);

  constructor() {
    // Route guards do not run again when you sign in while already on `/`; redirect here too.
    effect(() => {
      const user = this.auth.currentUser();
      this.userProfile.profile();

      if (!user) {
        return;
      }

      void (async () => {
        await this.userProfile.loadProfile(user.uid);
        const profile = this.userProfile.profile();
        const path = untracked(() => this.router.url.split("?")[0] ?? "");

        if (isProfileComplete(profile)) {
          return;
        }
        if (path === "/profile" || path.startsWith("/profile/")) {
          return;
        }
        await this.router.navigate(["/profile"], { replaceUrl: true });
      })();
    });
  }

  private readonly isLandingPage = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects === "/"),
    ),
    { initialValue: true },
  );
  readonly isMobile = toSignal(
    this.breakPointObserver.observe(Breakpoints.Handset).pipe(map((value) => value.matches)),
    { initialValue: true },
  );

  readonly sideBarIsToggled = signal(false);

  readonly shouldRenderSideBar = computed(() => !this.isLandingPage());
  readonly sideBarIsOpen = computed(
    () => this.shouldRenderSideBar() && (!this.isMobile() || this.sideBarIsToggled()),
  );

  onToggleSideBar() {
    this.sideBarIsToggled.update((prev) => !prev);
  }

  onCloseSideBar() {
    this.sideBarIsToggled.set(false);
  }
}
