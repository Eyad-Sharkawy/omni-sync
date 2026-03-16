import {Routes} from '@angular/router';
import {Shell} from './layout/shell/shell';

export const routes: Routes = [
  {
    path: "",
    component: Shell,
    title: "Omni Sync"
  },
  {
    path: "kanban",
    loadComponent: () =>
      import("./features/kanban/kanban").then((m) => m.Kanban),
    title: "Kanban",
  }
];
