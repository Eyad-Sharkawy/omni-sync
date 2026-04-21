import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from "@angular/core";

import { OmniSyncColors } from "../../../../shared/UI/colors";

@Component({
  selector: "os-task-tag",
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./task-tag.html",
  styleUrl: "./task-tag.css",
  host: {
    "[style.--color]": "'var(--color-os-' + color() + ')'",
  },
})
export class TaskTag {
  color = input.required<OmniSyncColors>();
  removeButton = input(false, { transform: booleanAttribute });
  remove = output();

  onRemove() {
    this.remove.emit();
  }
}
