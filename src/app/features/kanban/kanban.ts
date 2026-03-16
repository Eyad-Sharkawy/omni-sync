import { Component } from '@angular/core';
import {TaskCard} from "../../shared/task-card/task-card";
import {TasksColumn} from "../../shared/tasks-column/tasks-column";

@Component({
  selector: 'os-kanban',
    imports: [
        TaskCard,
        TasksColumn
    ],
  templateUrl: './kanban.html',
  styleUrl: './kanban.css',
})
export class Kanban {

}
