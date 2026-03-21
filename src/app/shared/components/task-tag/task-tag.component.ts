import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import { OmniSyncColors } from "../../UI/colors";

@Component({
  selector: "os-task-tag",
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./task-tag.component.html",
  styleUrl: "./task-tag.component.css",
  host: {
    "[style.--color]": "'var(--color-os-' + color() + ')'",
  },
})
export class TaskTag {
  color = input.required<OmniSyncColors>();
}
