import { Component } from '@angular/core';
import {TaskCard} from "../../shared/components/task-card/task-card";
import {TasksColumn} from "../../shared/components/tasks-column/tasks-column";
import {TaskMetaTag} from '../../shared/components/task-meta-tag/task-meta-tag';

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
