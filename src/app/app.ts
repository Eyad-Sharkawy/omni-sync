import { Component, signal } from '@angular/core';
import {RouterOutlet} from '@angular/router';

import {Navbar} from './layout/navbar/navbar';

@Component({
  selector: 'os-root',
  imports: [Navbar, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
}
