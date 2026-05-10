import { Routes } from "@angular/router";
import { landingPage } from "./layout/landing-page/landing-page";
import { KanbanStore } from "./features/kanban/services/kanban-store";
import { requireAuthGuard } from "./core/guards/auth.guard";
import { requireCompleteProfileGuard } from "./core/guards/complete-profile.guard";

export const routes: Routes = [
  {
    path: "",
    pathMatch: "full",
    component: landingPage,
    canActivate: [requireCompleteProfileGuard],
    title: "Omni Sync",
  },
  {
    path: "profile",
    loadComponent: () =>
      import("./features/profile/profile").then((m) => m.ProfilePage),
    canActivate: [requireAuthGuard],
    title: "Profile - Omni Sync",
  },
  {
    path: "",
    providers: [KanbanStore],
    canActivate: [requireCompleteProfileGuard],
    children: [
      {
        path: "kanban",
        loadChildren: () =>
          import("./features/kanban/kanban.routes").then((mod) => mod.KANBAN_ROUTES),
      },
      {
        path: "calendar",
        loadChildren: () =>
          import("./features/calendar/calender.routes").then((mod) => mod.CALENDAR_ROUTES),
      },
    ],
  },
];
