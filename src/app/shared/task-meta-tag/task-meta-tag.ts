import {Component, computed, input} from '@angular/core';

type MetaTagColors =
  | 'violet'
  | 'lavender'
  | 'grape'
  | 'indigo'
  | 'amber'
  | 'coral'
  | 'rose'
  | 'tomato'
  | 'sky'
  | 'cyan'
  | 'cerulean'
  | 'teal'
  | 'mint'
  | 'emerald'
  | 'lime'
  | 'sage'
  | 'slate'
  | 'stone'
  | 'zinc'
  | 'steel';

@Component({
  selector: 'os-task-meta-tag',
  imports: [],
  templateUrl: './task-meta-tag.html',
  styleUrl: './task-meta-tag.css',
  host: {
    "[class]": "hostClasses()"
  }
})
export class TaskMetaTag {
  metaTagColor = input.required<MetaTagColors>();

  hostClasses = computed(() => {
    const color = this.metaTagColor();

    const classes: Record<MetaTagColors, string> = {
      violet: 'text-meta-tag-violet bg-meta-tag-violet/10 border border-meta-tag-violet/20',
      lavender: 'text-meta-tag-lavender bg-meta-tag-lavender/10 border border-meta-tag-lavender/20',
      grape: 'text-meta-tag-grape bg-meta-tag-grape/10 border border-meta-tag-grape/20',
      indigo: 'text-meta-tag-indigo bg-meta-tag-indigo/10 border border-meta-tag-indigo/20',
      amber: 'text-meta-tag-amber bg-meta-tag-amber/10 border border-meta-tag-amber/20',
      coral: 'text-meta-tag-coral bg-meta-tag-coral/10 border border-meta-tag-coral/20',
      rose: 'text-meta-tag-rose bg-meta-tag-rose/10 border border-meta-tag-rose/20',
      tomato: 'text-meta-tag-tomato bg-meta-tag-tomato/10 border border-meta-tag-tomato/20',
      sky: 'text-meta-tag-sky bg-meta-tag-sky/10 border border-meta-tag-sky/20',
      cyan: 'text-meta-tag-cyan bg-meta-tag-cyan/10 border border-meta-tag-cyan/20',
      cerulean: 'text-meta-tag-cerulean bg-meta-tag-cerulean/10 border border-meta-tag-cerulean/20',
      teal: 'text-meta-tag-teal bg-meta-tag-teal/10 border border-meta-tag-teal/20',
      mint: 'text-meta-tag-mint bg-meta-tag-mint/10 border border-meta-tag-mint/20',
      emerald: 'text-meta-tag-emerald bg-meta-tag-emerald/10 border border-meta-tag-emerald/20',
      lime: 'text-meta-tag-lime bg-meta-tag-lime/10 border border-meta-tag-lime/20',
      sage: 'text-meta-tag-sage bg-meta-tag-sage/10 border border-meta-tag-sage/20',
      slate: 'text-meta-tag-slate bg-meta-tag-slate/10 border border-meta-tag-slate/20',
      stone: 'text-meta-tag-stone bg-meta-tag-stone/10 border border-meta-tag-stone/20',
      zinc: 'text-meta-tag-zinc bg-meta-tag-zinc/10 border border-meta-tag-zinc/20',
      steel: 'text-meta-tag-steel bg-meta-tag-steel/10 border border-meta-tag-steel/20',
    };

    return classes[color];
  });
}
