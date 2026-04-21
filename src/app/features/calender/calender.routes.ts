import { Routes } from "@angular/router";

import { Calender } from "./calender";

export const CALENDER_ROUTES: Routes = [
  {
    path: "",
    component: Calender,
    title: "Calender - Omni Sync",
  },
  {
    path: ":boardId",
    component: Calender,
    title: "Calender - Omni Sync",
  },
];
