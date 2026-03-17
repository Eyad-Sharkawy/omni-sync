import {Component, computed, inject} from '@angular/core';
import {DatePipe} from '@angular/common';

import {TaskCard} from "../../shared/components/task-card/task-card";
import {TasksColumn} from "../../shared/components/tasks-column/tasks-column";
import {TaskMetaTag} from '../../shared/components/task-meta-tag/task-meta-tag';
import {KanbanStore} from './services/kanban-store';

@Component({
  selector: 'os-kanban',
  imports: [
    TaskCard,
    TasksColumn,
    TaskMetaTag,
    DatePipe
  ],
  templateUrl: './kanban.html',
  styleUrl: './kanban.css',
})
export class Kanban {
  private kanbanStore = inject(KanbanStore);

  currentBoard = this.kanbanStore.currentBoard;
  boardName = computed(() => this.currentBoard().name);
  boardStartDate = computed(() => this.currentBoard().startDate);
  boardDueDate = computed(() => this.currentBoard().dueDate);
}
