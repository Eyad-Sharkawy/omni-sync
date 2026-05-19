import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";

import { KanbanStore } from "../../services/kanban-store";
import { UserProfileService } from "../../../../core/services/user-profile/user-profile";
import { todayISO } from "../../../../shared/forms/form-utils";
import { dateRangeValidator } from "../../../../shared/forms/form-validators";

@Component({
  selector: "os-create-board-form",
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./create-board-form.html",
  styleUrl: "./create-board-form.css",
})
export class CreateBoardForm {
  private readonly kanbanStore = inject(KanbanStore);
  private readonly userProfile = inject(UserProfileService);

  readonly selectedBoardId = input<string | null>(null);
  readonly closed = output<void>();
  readonly created = output<string>();

  protected form = new FormGroup(
    {
      name: new FormControl("", {
        validators: [Validators.required],
      }),
      startDate: new FormControl(todayISO(), {
        validators: [Validators.required],
      }),
      dueDate: new FormControl("", {
        validators: [Validators.required],
      }),
    },
    {
      validators: dateRangeValidator,
    },
  );

  protected readonly shareUsername = new FormControl("");

  readonly minDueDate = toSignal(this.form.controls.startDate.valueChanges, {
    initialValue: todayISO(),
  });

  readonly shareFeedback = signal<string | null>(null);

  private readonly memberLabels = signal(new Map<string, string>());

  /** Reactive list of collaborator UIDs for the board being edited. */
  readonly memberIdsForEdit = computed(() => {
    this.kanbanStore.boards();
    const id = this.selectedBoardId();
    if (!id) {
      return [] as string[];
    }
    const ids = this.kanbanStore.getBoardById(id)?.memberIds ?? [];
    return [...ids];
  });

  get isEditMode(): boolean {
    return !!this.selectedBoardId();
  }

  get nameIsInvalid(): boolean {
    const name = this.form.controls.name;
    return name.invalid && name.touched && name.dirty;
  }

  get startDateIsInvalid(): boolean {
    const startDate = this.form.controls.startDate;
    return startDate.invalid && startDate.touched && startDate.dirty;
  }

  get dueDateIsInvalid(): boolean {
    const dueDate = this.form.controls.dueDate;
    return dueDate.invalid && dueDate.touched && dueDate.dirty;
  }

  constructor() {
    effect(() => {
      const boardId = this.selectedBoardId();
      this.kanbanStore.boards();

      if (!boardId) {
        this.form.reset({
          name: "",
          startDate: new Date().toISOString().split("T")[0],
          dueDate: "",
        });
        this.form.enable({ emitEvent: false });
        this.form.markAsPristine();
        this.form.markAsUntouched();
        void this.refreshMemberLabels([]);
        return;
      }

      const board = this.kanbanStore.getBoardById(boardId);
      if (!board) {
        return;
      }

      this.form.reset({
        name: board.name,
        startDate: board.startDate.toISOString().split("T")[0],
        dueDate: board.dueDate.toISOString().split("T")[0],
      });
      this.form.enable({ emitEvent: false });
      this.form.markAsPristine();
      this.form.markAsUntouched();

      void this.refreshMemberLabels(board.memberIds ?? []);
    });
  }

  memberLabel(uid: string): string {
    return this.memberLabels().get(uid) ?? "…";
  }

  async onAddShare(): Promise<void> {
    const boardId = this.selectedBoardId();
    const raw = this.shareUsername.value?.trim() ?? "";
    if (!boardId || !raw) {
      return;
    }

    const result = await this.kanbanStore.shareBoardWithUsername(boardId, raw);
    if (result.ok) {
      this.setShareFeedback(`Shared with @${raw.toLowerCase()}.`);
      this.shareUsername.setValue("");
    } else {
      this.setShareFeedback(result.message);
    }
  }

  onRemoveMember(uid: string): void {
    const boardId = this.selectedBoardId();
    if (!boardId) {
      return;
    }
    const result = this.kanbanStore.removeBoardMember(boardId, uid);
    if (result.ok) {
      this.setShareFeedback("Removed from board.");
    } else {
      this.setShareFeedback(result.message);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.form.markAllAsDirty();
      return;
    }

    const { name, startDate, dueDate } = this.form.getRawValue();

    if (!name || !startDate || !dueDate) {
      return;
    }

    const cleanName = name.trim();
    if (!cleanName) {
      this.form.controls.name.setErrors({ required: true });
      this.form.controls.name.markAsTouched();
      this.form.controls.name.markAsDirty();
      return;
    }

    const start = new Date(startDate);
    const due = new Date(dueDate);

    if (due < start) {
      this.form.controls.dueDate.setErrors({ beforeStart: true });
      this.form.controls.dueDate.markAsTouched();
      this.form.controls.dueDate.markAsDirty();
      return;
    }

    const boardId = this.selectedBoardId();
    if (boardId) {
      this.kanbanStore.updateBoard(boardId, {
        name: cleanName,
        startDate: start,
        dueDate: due,
      });
    } else {
      const newBoardId = this.kanbanStore.addBoard({
        name: cleanName,
        startDate: start,
        dueDate: due,
      });
      this.created.emit(newBoardId);
    }

    this.onModalClosed();
  }

  onModalClosed(): void {
    this.closed.emit();
  }

  private setShareFeedback(message: string): void {
    this.shareFeedback.set(message);
    globalThis.setTimeout(() => this.shareFeedback.set(null), 5000);
  }

  private async refreshMemberLabels(uids: string[]): Promise<void> {
    if (uids.length === 0) {
      this.memberLabels.set(new Map());
      return;
    }

    const next = new Map(untracked(() => this.memberLabels()));

    for (const uid of uids) {
      if (next.has(uid)) {
        continue;
      }
      const p = await this.userProfile.getPublicProfile(uid);
      const handle = p?.username?.trim() ? `@${p.username}` : `User ${uid.slice(0, 8)}`;
      const full =
        p?.firstName?.trim() || p?.lastName?.trim()
          ? `${handle} · ${p?.firstName ?? ""} ${p?.lastName ?? ""}`.trim()
          : handle;
      next.set(uid, full);
    }

    for (const k of [...next.keys()]) {
      if (!uids.includes(k)) {
        next.delete(k);
      }
    }

    this.memberLabels.set(next);
  }
}
