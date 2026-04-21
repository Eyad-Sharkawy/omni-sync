import { Component, input, output } from "@angular/core";
import { NgOptimizedImage } from "@angular/common";
import { RouterLink } from "@angular/router";
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList } from "@angular/cdk/drag-drop";

import { Modal } from "../../../../shared/components/modal/modal";
import { Board } from "../../../../core/models/board";

@Component({
  selector: "os-view-boards-modal",
  imports: [Modal, CdkDropList, CdkDrag, CdkDragHandle, RouterLink, NgOptimizedImage],
  templateUrl: "./view-boards-modal.html",
  styleUrl: "./view-boards-modal.css",
})
export class ViewBoardsModal {
  readonly boards = input.required<Board[]>();
  readonly currentBoard = input.required<Board>();
  readonly boardRoutePrefix = input<"kanban" | "calender">("kanban");
  readonly readonlyMode = input(false);

  readonly closed = output<void>();
  readonly createBoard = output<void>();
  readonly editBoard = output<string>();
  readonly deleteBoard = output<string>();
  readonly dropBoard = output<CdkDragDrop<Board[]>>();
  readonly selectBoard = output<string>();
}
