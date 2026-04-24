import { Routes } from "@angular/router";
import { landingPage } from "./layout/landing-page/landing-page";
import { KanbanStore } from "./features/kanban/services/kanban-store";

export const routes: Routes = [
  {
    path: "",
    component: landingPage,
    title: "Omni Sync",
  },
  {
    path: "",
    providers: [KanbanStore],
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
