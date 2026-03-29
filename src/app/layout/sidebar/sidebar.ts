import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
} from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { BreakpointObserver, Breakpoints } from "@angular/cdk/layout";
import { toSignal } from "@angular/core/rxjs-interop";
import { map } from "rxjs";

@Component({
  selector: "os-sidebar",
  imports: [RouterLink, RouterLinkActive],
  templateUrl: "./sidebar.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: "./sidebar.css",
  host: {
    "[style.--width]": "width()",
  },
})
export class Sidebar {
  private readonly breakPointObserver = inject(BreakpointObserver);

  readonly isOpen = input(true);
  readonly width = signal<"0rem" | "13.75rem" | "3.75rem" | "100vw">("0rem");
  readonly collapsed = signal(false);
  private readonly hasMounted = signal(false);
  readonly isMobile = toSignal(
    this.breakPointObserver.observe(Breakpoints.Handset).pipe(map((value) => value.matches)),
    { initialValue: true },
  );

  constructor() {
    afterNextRender(() => {
      this.hasMounted.set(true);
    });

    effect(() => {
      if (!this.hasMounted()) {
        this.width.set("0rem");
        return;
      }

      if (!this.isOpen()) {
        this.width.set("0rem");
        return;
      }

      this.width.set(this.isMobile() ? "100vw" : this.collapsed() ? "3.75rem" : "13.75rem");
    });
  }

  onToggleCollapse() {
    this.collapsed.update((prev) => !prev);
  }
}
