import { Component, effect, inject, input, output, signal, untracked } from "@angular/core";
import { NgOptimizedImage } from "@angular/common";
import { RouterLink } from "@angular/router";
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList } from "@angular/cdk/drag-drop";

import { Modal } from "../../../../shared/components/modal/modal";
import { Board } from "../../../../core/models/board";
import { UserProfileService } from "../../../../core/services/user-profile/user-profile";

@Component({
  selector: "os-view-boards-modal",
  imports: [Modal, CdkDropList, CdkDrag, CdkDragHandle, RouterLink, NgOptimizedImage],
  templateUrl: "./view-boards-modal.html",
  styleUrl: "./view-boards-modal.css",
})
export class ViewBoardsModal {
  private readonly userProfile = inject(UserProfileService);

  /** Boards you own (reorder, share, edit). */
  readonly myBoards = input.required<Board[]>();
  /** Boards others shared with you. */
  readonly sharedBoards = input<Board[]>([]);
  readonly currentBoard = input.required<Board>();
  readonly boardRoutePrefix = input<"kanban" | "calendar">("kanban");
  readonly readonlyMode = input(false);

  readonly closed = output<void>();
  readonly createBoard = output<void>();
  readonly editBoard = output<string>();
  readonly deleteBoard = output<string>();
  readonly dropBoard = output<CdkDragDrop<Board[]>>();
  readonly selectBoard = output<string>();
  /** Collaborator removes this shared board from their list (does not delete the board). */
  readonly leaveSharedBoard = output<string>();

  private readonly ownerLabels = signal(new Map<string, string>());
  private readonly ownerInitials = signal(new Map<string, string>());

  constructor() {
    effect(() => {
      const shared = this.sharedBoards();
      void this.refreshOwnerLabels(shared);
    });
  }

  totalCount(): number {
    return this.myBoards().length + this.sharedBoards().length;
  }

  ownerLabel(uid: string | undefined): string {
    if (!uid) {
      return "";
    }
    return this.ownerLabels().get(uid) ?? "…";
  }

  ownerInitialsFor(uid: string | undefined): string {
    if (!uid) {
      return "?";
    }
    return this.ownerInitials().get(uid) ?? "…";
  }

  private async refreshOwnerLabels(shared: Board[]): Promise<void> {
    const uids = [
      ...new Set(
        shared
          .map((b) => b.sharedFromOwnerId)
          .filter((x): x is string => typeof x === "string" && x.length > 0),
      ),
    ];

    // Must not read owner signals in the effect's tracking context or their updates
    // re-trigger this effect → an infinite loop / frozen UI.
    const nextLabels = new Map(untracked(() => this.ownerLabels()));
    const nextInitials = new Map(untracked(() => this.ownerInitials()));

    for (const uid of uids) {
      if (nextLabels.has(uid)) {
        continue;
      }

      const p = await this.userProfile.getPublicProfile(uid);
      const label =
        p && p.username.trim()
          ? `@${p.username} · ${p.firstName} ${p.lastName}`.trim()
          : `User ${uid.slice(0, 8)}`;
      nextLabels.set(uid, label);
      nextInitials.set(uid, p ? this.initialsFromProfile(p) : uid.slice(0, 2).toUpperCase());
    }

    this.ownerLabels.set(nextLabels);
    this.ownerInitials.set(nextInitials);
  }

  private initialsFromProfile(p: {
    username: string;
    firstName: string;
    lastName: string;
  }): string {
    const fn = p.firstName.trim();
    const ln = p.lastName.trim();
    if (fn && ln) {
      return `${fn[0]!}${ln[0]!}`.toUpperCase();
    }
    if (fn.length >= 2) {
      return fn.slice(0, 2).toUpperCase();
    }
    const u = p.username.trim();
    if (u.length >= 2) {
      return u.slice(0, 2).toUpperCase();
    }
    return "?";
  }
}
