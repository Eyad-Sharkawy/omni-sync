import { inject, Injectable, signal } from "@angular/core";

import { Gemini } from "../../../../../core/services/gemini/gemini";
import { Task } from "../../../../../core/models/task";
import { TaskFormGroup } from "../task-form.factory";
import { AiGenerateField, ALL_AI_FIELDS } from "./task-ai.types";
import { applySuggestion, buildGenerationContext } from "./task-ai.utils";

export type TaskAiGenerateResult = { ok: true; tags: Task["tags"] } | { ok: false; error: string };

@Injectable()
export class TaskAiFacade {
  private readonly gemini = inject(Gemini);

  readonly generating = signal<ReadonlySet<AiGenerateField>>(new Set());

  isGenerating(field: AiGenerateField): boolean {
    return this.generating().has(field);
  }

  isGeneratingAll(): boolean {
    const g = this.generating();
    return ALL_AI_FIELDS.every((field) => g.has(field));
  }

  async generate(
    form: TaskFormGroup,
    fields: AiGenerateField[],
    columnLabel: string,
    currentTags: Task["tags"],
  ): Promise<TaskAiGenerateResult> {
    const title = form.controls.title.value.trim();
    const startDate = form.controls.startDate.value;

    if (!title) {
      form.controls.title.markAsDirty();
      form.controls.title.markAsTouched();
      return { ok: false, error: "Add a task title first." };
    }

    if (!startDate) {
      return { ok: false, error: "Add a start date first." };
    }

    this.setGenerating(fields, true);

    try {
      const context = buildGenerationContext(
        form.getRawValue(),
        columnLabel,
        currentTags.map((t) => t.text),
      );

      const suggestion = await this.gemini.generateTaskMetadata(title, startDate, fields, context);

      const { tags } = applySuggestion(form, fields, suggestion, currentTags, startDate);

      return { ok: true, tags };
    } catch {
      return {
        ok: false,
        error: "Could not generate suggestions right now. Please try again.",
      };
    } finally {
      this.setGenerating(fields, false);
    }
  }

  private setGenerating(fields: AiGenerateField[], active: boolean): void {
    this.generating.update((current) => {
      const next = new Set(current);
      for (const field of fields) {
        if (active) next.add(field);
        else next.delete(field);
      }
      return next;
    });
  }
}
