import { Routes } from "@angular/router";

import { Kanban } from "./kanban";

export const KANBAN_ROUTES: Routes = [
  {
    path: "",
    component: Kanban,
    title: "Kanban - Omni Sync",
  },
  {
    path: ":boardId",
    component: Kanban,
    title: "Kanban - Omni Sync",
  },
];
