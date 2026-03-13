import { Component, signal } from '@angular/core';
import {RouterLink, RouterOutlet} from '@angular/router';
import {Navbar} from './layout/navbar/navbar';
import {TasksColumn} from './shared/tasks-column/tasks-column';

@Component({
  selector: 'os-root',
  imports: [RouterOutlet, RouterLink, Navbar, TasksColumn],
  templateUrl: './app.html',
  styleUrl: './app.css',
  host: {
    class: "flex flex-col h-screen text-primary font-display"
  }
})
export class App {
  protected readonly title = signal('omni-sync');
}
