import { Routes } from "@angular/router";
import { Kanban } from "./kanban";
import { KanbanStore } from "./services/kanban-store";

export const KANBAN_ROUTES: Routes = [
  {
    path: "",
    component: Kanban,
    providers: [KanbanStore],
    title: "Kanban - Omni Sync",
  },
  {
    path: ":boardId",
    component: Kanban,
    providers: [KanbanStore],
    title: "Kanban - Omni Sync",
  },
];
