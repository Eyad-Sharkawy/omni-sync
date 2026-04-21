import { Routes } from "@angular/router";

import { Calendar } from "../calender/calender";

export const CALENDAR_ROUTES: Routes = [
  {
    path: "",
    component: Calendar,
    title: "Calender - Omni Sync",
  },
  {
    path: ":boardId",
    component: Calendar,
    title: "Calender - Omni Sync",
  },
];
