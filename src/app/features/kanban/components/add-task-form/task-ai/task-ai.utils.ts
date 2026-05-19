import { TaskFormGroup } from "../task-form.factory";
import {
  TaskGenerationContext,
  TaskMetadataSuggestion,
} from "../../../../../core/services/gemini/gemini";
import { ALL_COLORS } from "../../../../../shared/UI/colors";
import { nanoid } from "nanoid";
import { Task } from "../../../../../core/models/task";
import { AiGenerateField } from "./task-ai.types";

export function buildGenerationContext(
  formValue: ReturnType<TaskFormGroup["getRawValue"]>,
  columnLabel: string,
  tagTexts: string[],
): TaskGenerationContext {
  const context: TaskGenerationContext = { columnLabel };

  const description = formValue.description?.trim();

  if (description) {
    context.existingDescription = description;
  }

  if (formValue.priority) {
    context.existingPriority = formValue.priority;
  }

  const dueDate = formValue.dueDate?.trim();

  if (dueDate) {
    context.existingDueDate = dueDate;
  }

  if (tagTexts.length > 0) {
    context.existingTags = tagTexts;
  }

  return context;
}

export function isValidDueDate(value: string, startDate: string): boolean {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  if (!startDate) {
    return true;
  }

  return parsed >= new Date(startDate);
}

export function mergeGeneratedTags(
  current: Task["tags"],
  suggestedStrings: string[],
): Task["tags"] {
  if (suggestedStrings.length === 0) return current;
  const existingSet = new Set(current.map((tag) => tag.text.toLowerCase()));
  const generated = suggestedStrings
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (existingSet.has(key)) return false;
      existingSet.add(key);
      return true;
    })
    .slice(0, 4)
    .map((text) => ({
      id: nanoid(),
      text,
      color: ALL_COLORS[Math.floor(Math.random() * ALL_COLORS.length)],
    }));
  return generated.length > 0 ? [...current, ...generated] : current;
}

export interface ApplySuggestionResult {
  tags: Task["tags"];
  tagsChanged: boolean;
}
export function applySuggestion(
  form: TaskFormGroup,
  fields: AiGenerateField[],
  suggestion: TaskMetadataSuggestion,
  currentTags: Task["tags"],
  startDate: string,
): ApplySuggestionResult {
  if (fields.includes("description") && suggestion.description !== undefined) {
    form.controls.description.setValue(suggestion.description.trim());
  }
  if (
    fields.includes("priority") &&
    (suggestion.priority === "low" ||
      suggestion.priority === "medium" ||
      suggestion.priority === "high")
  ) {
    form.controls.priority.setValue(suggestion.priority);
  }
  if (
    fields.includes("dueDate") &&
    suggestion.dueDate &&
    isValidDueDate(suggestion.dueDate, startDate)
  ) {
    form.controls.dueDate.setValue(suggestion.dueDate);
  }
  let tags = currentTags;
  let tagsChanged = false;
  if (fields.includes("tags") && suggestion.tags?.length) {
    const merged = mergeGeneratedTags(currentTags, suggestion.tags);
    if (merged !== currentTags) {
      tags = merged;
      tagsChanged = true;
    }
  }
  return { tags, tagsChanged };
}
