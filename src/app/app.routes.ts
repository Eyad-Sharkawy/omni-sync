import { Routes } from "@angular/router";
import { landingPage } from "./layout/landing-page/landing-page";

export const routes: Routes = [
  {
    path: "",
    component: landingPage,
    title: "Omni Sync",
  },
  {
    path: "kanban",
    loadChildren: () => import("./features/kanban/kanban.routes").then((mod) => mod.KANBAN_ROUTES),
  },
];
