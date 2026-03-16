import {ChangeDetectionStrategy, Component, computed, input, numberAttribute} from '@angular/core';
import {OmniSyncColors} from '../../UI/colors';


@Component({
  selector: 'os-tasks-column',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tasks-column.html',
  styleUrl: './tasks-column.css',
  host: {
    "[class]": "hostClass()"
  }
})
export class TasksColumn {
  numberOfTasks = input.required({transform: numberAttribute});
  columnColor = input.required<OmniSyncColors>()

  protected hostClass = computed(() => {
    const type = this.columnColor();

    const classes: Record<OmniSyncColors, string> = {
      // Purple & Indigo
      violet: "before:bg-os-violet",
      lavender: "before:bg-os-lavender",
      grape: "before:bg-os-grape",
      indigo: "before:bg-os-indigo",

      // Warm Tones
      amber: "before:bg-os-amber",
      coral: "before:bg-os-coral",
      rose: "before:bg-os-rose",
      tomato: "before:bg-os-tomato",

      // Blue & Cyan
      sky: "before:bg-os-sky",
      cyan: "before:bg-os-cyan",
      cerulean: "before:bg-os-cerulean",
      teal: "before:bg-os-teal",

      // Greens
      mint: "before:bg-os-mint",
      emerald: "before:bg-os-emerald",
      lime: "before:bg-os-lime",
      sage: "before:bg-os-sage",

      // Neutrals
      slate: "before:bg-os-slate",
      stone: "before:bg-os-stone",
      zinc: "before:bg-os-zinc",
      steel: "before:bg-os-steel",
    };

    return classes[type];
  });

  headerSpanClasses: Record<OmniSyncColors, string> = {
    // Purple & Indigo
    violet: "bg-os-violet shadow-os-violet",
    lavender: "bg-os-lavender shadow-os-lavender",
    grape: "bg-os-grape shadow-os-grape",
    indigo: "bg-os-indigo shadow-os-indigo",

    // Warm Tones
    amber: "bg-os-amber shadow-os-amber",
    coral: "bg-os-coral shadow-os-coral",
    rose: "bg-os-rose shadow-os-rose",
    tomato: "bg-os-tomato shadow-os-tomato",

    // Blue & Cyan
    sky: "bg-os-sky shadow-os-sky",
    cyan: "bg-os-cyan shadow-os-cyan",
    cerulean: "bg-os-cerulean shadow-os-cerulean",
    teal: "bg-os-teal shadow-os-teal",

    // Green
    mint: "bg-os-mint shadow-os-mint",
    emerald: "bg-os-emerald shadow-os-emerald",
    lime: "bg-os-lime shadow-os-lime",
    sage: "bg-os-sage shadow-os-sage",

    // Neutral
    slate: "bg-os-slate shadow-os-slate",
    stone: "bg-os-stone shadow-os-stone",
    zinc: "bg-os-zinc shadow-os-zinc",
    steel: "bg-os-steel shadow-os-steel",
  }
}
