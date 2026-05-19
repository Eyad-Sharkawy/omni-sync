import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from "@angular/cdk/drag-drop";
import { nanoid } from "nanoid";

import { Task } from "../../../../../../core/models/task";
import { ALL_COLORS, OmniSyncColors } from "../../../../../../shared/UI/colors";
import { TaskTag } from "../../../task-tag/task-tag";

@Component({
  selector: "os-task-tags",
  imports: [ReactiveFormsModule, TaskTag, CdkDrag, CdkDropList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./task-tags.html",
  styleUrl: "./task-tags.css",
})
export class TaskTags {
  readonly tags = input.required<Task["tags"]>();
  readonly accentColor = input.required<OmniSyncColors>();

  readonly generating = input(false);
  readonly generateRequested = output<void>();

  readonly tagsChange = output<Task["tags"]>();

  protected readonly tagInput = new FormControl("", { nonNullable: true });

  protected addTag(): void {
    const value = this.tagInput.value.trim();
    if (!value) return;

    const exists = this.tags().some((tag) => tag.text.toLowerCase() === value.toLowerCase());
    if (exists) return;

    this.tagsChange.emit([
      ...this.tags(),
      { id: nanoid(), text: value, color: this.accentColor() },
    ]);
    this.tagInput.reset();
  }

  protected onTagEnter(event: Event): void {
    event.preventDefault();
    this.addTag();
  }

  protected removeTag(tagId: string): void {
    this.tagsChange.emit(this.tags().filter((tag) => tag.id !== tagId));
  }

  protected onTagClick(tagId: string): void {
    this.tagsChange.emit(
      this.tags().map((tag) => {
        if (tag.id !== tagId) return tag;
        const i = ALL_COLORS.indexOf(tag.color);
        return { ...tag, color: ALL_COLORS[(i + 1) % ALL_COLORS.length] };
      }),
    );
  }

  protected onDropTag(event: CdkDragDrop<Task["tags"]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const next = [...this.tags()];
    moveItemInArray(next, event.previousIndex, event.currentIndex);
    this.tagsChange.emit(next);
  }

  protected onDragStarted(): void {
    document.body.classList.add("is-dragging");
  }

  protected onDragEnded(): void {
    document.body.classList.remove("is-dragging");
  }
}
