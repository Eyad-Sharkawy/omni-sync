import { Component, signal } from '@angular/core';

import {Navbar} from './layout/navbar/navbar';
import {TasksColumn} from './shared/tasks-column/tasks-column';
import {TaskCard} from './shared/task-card/task-card';
import {Kanban} from './features/kanban/kanban';
import {RouterOutlet} from '@angular/router';

@Component({
  selector: 'os-root',
  imports: [Navbar, TasksColumn, TaskCard, Kanban, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('omni-sync');
}
