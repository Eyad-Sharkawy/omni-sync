import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  TemplateRef,
  viewChild,
  ViewContainerRef,
} from "@angular/core";
import { Overlay, OverlayRef } from "@angular/cdk/overlay";
import { TemplatePortal } from "@angular/cdk/portal";
import { CdkTrapFocus } from "@angular/cdk/a11y";
import { OmniSyncColors } from "../../UI/colors";

@Component({
  selector: "os-modal",
  imports: [CdkTrapFocus],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./modal.html",
  styleUrl: "./modal.css",
  host: {
    "[style.--color]": "'var(--color-os-' + color() + ')'",
  },
})
export class Modal implements OnDestroy {
  private readonly overlay = inject(Overlay);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly modalTemplate = viewChild.required<TemplateRef<unknown>>("modalTemplate");
  private readonly dialogRoot = viewChild.required<ElementRef<HTMLElement>>("dialogRoot");
  private overlayRef: OverlayRef | null = null;

  readonly title = input.required<string>();
  readonly badge = input<string>("");
  readonly color = input<OmniSyncColors>("zinc");
  readonly closed = output<void>();

  constructor() {
    afterNextRender(() => {
      this.overlayRef = this.overlay.create({
        hasBackdrop: true,
        backdropClass: "os-modal-backdrop",
        positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically(),
        scrollStrategy: this.overlay.scrollStrategies.block(),
        width: "100%",
        maxWidth: "520px",
      });

      const portal = new TemplatePortal(this.modalTemplate(), this.viewContainerRef);
      this.overlayRef.attach(portal);
      queueMicrotask(() => this.dialogRoot().nativeElement.focus({ preventScroll: true }));

      this.overlayRef.backdropClick().subscribe(() => this.requestClose());
      this.overlayRef.keydownEvents().subscribe((event) => {
        if (event.key === "Escape") {
          this.requestClose();
        }
      });
    });
  }

  ngOnDestroy() {
    this.overlayRef?.dispose();
  }

  requestClose(): void {
    this.closed.emit();
  }
}
