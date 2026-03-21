import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";

import { OmniSyncColors } from "../../UI/colors";

@Component({
  selector: "os-task-meta-tag",
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./task-meta-tag.html",
  styleUrl: "./task-meta-tag.css",
  host: {
    "[class]": "hostClasses()",
  },
})
export class TaskMetaTag {
  color = input.required<OmniSyncColors>();

  hostClasses = computed(() => {
    const color = this.color();

    const classes: Record<OmniSyncColors, string> = {
      // Purple & Indigo
      violet: "text-os-violet bg-os-violet/10 border border-os-violet/20",
      lavender: "text-os-lavender bg-os-lavender/10 border border-os-lavender/20",
      grape: "text-os-grape bg-os-grape/10 border border-os-grape/20",
      indigo: "text-os-indigo bg-os-indigo/10 border border-os-indigo/20",

      // Warm
      amber: "text-os-amber bg-os-amber/10 border border-os-amber/20",
      coral: "text-os-coral bg-os-coral/10 border border-os-coral/20",
      rose: "text-os-rose bg-os-rose/10 border border-os-rose/20",
      tomato: "text-os-tomato bg-os-tomato/10 border border-os-tomato/20",

      // Blues & Cyan
      sky: "text-os-sky bg-os-sky/10 border border-os-sky/20",
      cyan: "text-os-cyan bg-os-cyan/10 border border-os-cyan/20",
      cerulean: "text-os-cerulean bg-os-cerulean/10 border border-os-cerulean/20",
      teal: "text-os-teal bg-os-teal/10 border border-os-teal/20",

      // Green
      mint: "text-os-mint bg-os-mint/10 border border-os-mint/20",
      emerald: "text-os-emerald bg-os-emerald/10 border border-os-emerald/20",
      lime: "text-os-lime bg-os-lime/10 border border-os-lime/20",
      sage: "text-os-sage bg-os-sage/10 border border-os-sage/20",

      // Neutral
      slate: "text-os-slate bg-os-slate/10 border border-os-slate/20",
      stone: "text-os-stone bg-os-stone/10 border border-os-stone/20",
      zinc: "text-os-zinc bg-os-zinc/10 border border-os-zinc/20",
      steel: "text-os-steel bg-os-steel/10 border border-os-steel/20",
    };

    return classes[color];
  });
}
