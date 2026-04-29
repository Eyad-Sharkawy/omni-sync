import { Component, computed, inject, signal } from "@angular/core";
import { NavigationEnd, Router, RouterOutlet } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";
import { BreakpointObserver, Breakpoints } from "@angular/cdk/layout";
import { filter, map } from "rxjs";

import { Navbar } from "./layout/navbar/navbar";
import { Sidebar } from "./layout/sidebar/sidebar";
import { Auth } from "./core/services/auth/auth";

@Component({
  selector: "os-root",
  imports: [Navbar, RouterOutlet, Sidebar],
  templateUrl: "./app.html",
  styleUrl: "./app.css",
})
export class App {
  private readonly router = inject(Router);
  private readonly breakPointObserver = inject(BreakpointObserver);
  private readonly auth = inject(Auth);
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

  constructor() {
    void this.auth.completeEmailLinkSignInIfPresent(globalThis.location?.href ?? "");
  }

  onToggleSideBar() {
    this.sideBarIsToggled.update((prev) => !prev);
  }

  onCloseSideBar() {
    this.sideBarIsToggled.set(false);
  }
}
