import { Routes } from "@angular/router";
import { Shell } from "./layout/shell/shell";

export const routes: Routes = [
  {
    path: "",
    component: Shell,
    title: "Omni Sync",
  },
  {
    path: "kanban",
    loadChildren: () => import("./features/kanban/kanban.routes").then((mod) => mod.KANBAN_ROUTES),
  },
];
