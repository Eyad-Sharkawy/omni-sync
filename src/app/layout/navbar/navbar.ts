import { Component, inject, output } from "@angular/core";
import { NavigationEnd, Router, RouterLink } from "@angular/router";
import { NgOptimizedImage } from "@angular/common";
import { BreakpointObserver, Breakpoints } from "@angular/cdk/layout";
import { toSignal } from "@angular/core/rxjs-interop";
import { filter, map } from "rxjs";

@Component({
  selector: "os-navbar",
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: "./navbar.html",
  styleUrl: "./navbar.css",
})
export class Navbar {
  private readonly router = inject(Router);
  private readonly breakPointObserver = inject(BreakpointObserver);

  readonly toggleSideBar = output();

  readonly isLandingPage = toSignal(
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

  onToggleSideBar() {
    this.toggleSideBar.emit();
  }
}
