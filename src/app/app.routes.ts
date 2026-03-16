import { Routes } from '@angular/router';
import {Shell} from './layout/shell/shell';
import {Kanban} from './features/kanban/kanban';

export const routes: Routes = [
  {
    path: "",
    component: Shell,
    title: "Omni Sync"
  },
  {
    path: "kanban",
    component: Kanban,
    title: "Kanban",
  }
];
