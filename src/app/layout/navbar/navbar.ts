import { Component, computed, inject, output, signal } from "@angular/core";
import { NavigationEnd, Router, RouterLink } from "@angular/router";
import { NgOptimizedImage } from "@angular/common";
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from "@angular/cdk/menu";
import { BreakpointObserver, Breakpoints } from "@angular/cdk/layout";
import { toSignal } from "@angular/core/rxjs-interop";
import { filter, map } from "rxjs";
import { Auth } from "../../core/services/auth/auth";
import { UserProfileService } from "../../core/services/user-profile/user-profile";
import { profileInitials } from "../../core/models/user-profile";
import { landingPage } from "../landing-page/landing-page";
import { LoginPopup } from "../../features/auth/components/login-popup/login-popup";

@Component({
  selector: "os-navbar",
  imports: [RouterLink, NgOptimizedImage, LoginPopup, CdkMenuTrigger, CdkMenu, CdkMenuItem],
  templateUrl: "./navbar.html",
  styleUrl: "./navbar.css",
})
export class Navbar {
  private readonly router = inject(Router);
  private readonly breakPointObserver = inject(BreakpointObserver);

  readonly toggleSideBar = output();

  readonly auth = inject(Auth);
  private readonly userProfile = inject(UserProfileService);
  readonly isLoginPopupOpen = signal(false);

  /** Two-letter avatar for the signed-in user (profile names, else email). */
  readonly avatarLabel = computed(() => {
    const profile = this.userProfile.profile();
    if (profile?.firstName?.trim() && profile?.lastName?.trim()) {
      return profileInitials(profile);
    }
    const email = this.auth.currentUser()?.email;
    if (email && email.length >= 2) {
      return email.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 1).toUpperCase();
    }
    return "?";
  });

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

  openLoginPopup(): void {
    this.isLoginPopupOpen.set(true);
  }

  closeLoginPopup(): void {
    this.isLoginPopupOpen.set(false);
  }

  protected readonly landingPage = landingPage;
}
