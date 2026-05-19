export type AiGenerateField = "description" | "priority" | "dueDate" | "tags";

export const ALL_AI_FIELDS: readonly AiGenerateField[] = [
  "description",
  "priority",
  "dueDate",
  "tags",
] as const;
