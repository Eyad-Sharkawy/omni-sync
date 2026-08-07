import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { BreakpointObserver, Breakpoints } from "@angular/cdk/layout";
import { toSignal } from "@angular/core/rxjs-interop";
import { map } from "rxjs";
import { startWith } from "rxjs";

import { Auth } from "../../core/services/auth/auth";
import { LoginPopup } from "../../features/auth/components/login-popup/login-popup";

/** Same predicate as CDK `Breakpoints.Handset` for correct first paint vs `observe()`. */
function handsetMatchesSync(): boolean {
  return (
    typeof globalThis.matchMedia === "function" &&
    globalThis.matchMedia(Breakpoints.Handset).matches
  );
}

@Component({
  selector: "os-sidebar",
  imports: [RouterLink, RouterLinkActive, LoginPopup],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./sidebar.html",
  styleUrl: "./sidebar.css",
  host: {
    "[style.--width]": "sidebarWidth()",
  },
})
export class Sidebar {
  private readonly breakPointObserver = inject(BreakpointObserver);

  readonly auth = inject(Auth);
  readonly isLoginPopupOpen = signal(false);

  readonly isOpen = input(true);
  readonly collapsed = signal(false);

  readonly isMobile = toSignal(
    this.breakPointObserver.observe(Breakpoints.Handset).pipe(
      map((value) => value.matches),
      startWith(handsetMatchesSync()),
    ),
    { initialValue: handsetMatchesSync() },
  );

  /** Derived width avoids 0→full expansion after `afterNextRender`, which heavily inflated CLS. */
  readonly sidebarWidth = computed((): "0rem" | "13.75rem" | "3.75rem" | "75vw" => {
    if (!this.isOpen()) {
      return "0rem";
    }
    if (this.isMobile()) {
      return "75vw";
    }
    return this.collapsed() ? "3.75rem" : "13.75rem";
  });

  onToggleCollapse() {
    this.collapsed.update((prev) => !prev);
  }

  openLoginPopup(): void {
    this.isLoginPopupOpen.set(true);
  }

  closeLoginPopup(): void {
    this.isLoginPopupOpen.set(false);
  }
}
