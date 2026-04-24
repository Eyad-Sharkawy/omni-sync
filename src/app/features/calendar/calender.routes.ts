import { Routes } from "@angular/router";

import { Calendar } from "./calendar";

export const CALENDAR_ROUTES: Routes = [
  {
    path: "",
    component: Calendar,
    title: "Calendar - Omni Sync",
  },
  {
    path: ":boardId",
    component: Calendar,
    title: "Calendar - Omni Sync",
  },
];
