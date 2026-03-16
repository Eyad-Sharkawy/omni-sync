import { Component } from '@angular/core';
import {TaskCard} from "../../shared/task-card/task-card";
import {TasksColumn} from "../../shared/tasks-column/tasks-column";
import {TaskMetaTag} from '../../shared/task-meta-tag/task-meta-tag';

@Component({
  selector: 'os-kanban',
  imports: [
    TaskCard,
    TasksColumn,
    TaskMetaTag
  ],
  templateUrl: './kanban.html',
  styleUrl: './kanban.css',
})
export class Kanban {

}
