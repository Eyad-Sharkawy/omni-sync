import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";

type SuggestedPriority = "low" | "medium" | "high";
type SuggestionField = "description" | "priority" | "dueDate" | "tags";

export interface TaskMetadataSuggestion {
  description?: string;
  priority?: SuggestedPriority;
  dueDate?: string;
  tags?: string[];
}

/** Optional fields already filled in the form — used as extra grounding for AI. */
export interface TaskGenerationContext {
  existingDescription?: string;
  existingPriority?: SuggestedPriority;
  existingDueDate?: string;
  existingTags?: string[];
  columnLabel?: string;
}

@Injectable({
  providedIn: "root",
})
export class Gemini {
  private readonly http = inject(HttpClient);

  async generateContent(prompt: string): Promise<string> {
    const response = await firstValueFrom(
      this.http.post<{ text: string; error?: string }>("/api/gemini", { prompt }),
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response.text ?? "";
  }

  async generateTaskMetadata(
    title: string,
    startDate: string,
    fields: SuggestionField[],
    context?: TaskGenerationContext,
  ): Promise<TaskMetadataSuggestion> {
    const contextLines: string[] = [];

    if (context?.columnLabel?.trim()) {
      contextLines.push(`Column / list name: ${context.columnLabel.trim()}`);
    }
    if (context?.existingDescription?.trim()) {
      contextLines.push(
        `Existing description (keep facts, language, and tone aligned with this when improving):\n${context.existingDescription.trim()}`,
      );
    }
    if (context?.existingPriority) {
      contextLines.push(`Current priority selection: ${context.existingPriority}`);
    }
    if (context?.existingDueDate?.trim()) {
      contextLines.push(`Current due date (YYYY-MM-DD): ${context.existingDueDate.trim()}`);
    }
    if (context?.existingTags && context.existingTags.length > 0) {
      contextLines.push(`Existing tags: ${context.existingTags.join(", ")}`);
    }

    const hasRichContext =
      !!context?.existingDescription?.trim() &&
      !!context?.existingPriority &&
      !!context?.existingDueDate?.trim() &&
      (context?.existingTags?.length ?? 0) > 0;

    const prompt = [
      "You are helping generate task metadata for a task board.",
      "",
      "LANGUAGE (required): Write every generated string field (description, tags) in the SAME language as the user's task title. If a title mixes languages, follow the title's primary language. Use the same script (Latin, Arabic, CJK, etc.) as the title. Do not translate the title or the user's existing text into another language unless the user wrote in multiple languages.",
      "",
      `Task title: "${title}"`,
      `Task start date (YYYY-MM-DD): ${startDate}`,
      `Generate only these JSON fields: ${fields.join(", ")}`,
      "",
      ...(contextLines.length > 0
        ? [
            hasRichContext
              ? "The user already filled description, priority, due date, and tags. Use ALL of the following as grounding—stay consistent, refine or extend without contradicting facts:"
              : "Optional context already entered by the user (use when relevant; stay consistent and do not invent conflicting facts):",
            ...contextLines,
            "",
          ]
        : []),
      'Return ONLY strict JSON with optional keys: {"description":"", "priority":"low|medium|high", "dueDate":"YYYY-MM-DD", "tags":["tag1","tag2"]}',
      "Rules:",
      "- description: max 220 chars, concise. Same language as the title (and existing description if any).",
      "- priority: one of low, medium, high (English keys only in JSON).",
      "- dueDate: valid YYYY-MM-DD, not before the start date above.",
      "- tags: 1 to 4 short labels in the same language as the title; avoid duplicate meanings with existing tags when possible.",
      "- Output JSON only—no markdown, no code fences, no explanation.",
    ].join("\n");

    const text = await this.generateContent(prompt);
    return this.parseSuggestionJson(text);
  }

  private parseSuggestionJson(text: string): TaskMetadataSuggestion {
    const normalized = text.trim();
    const withoutCodeFence = normalized
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const candidate = this.extractFirstJsonObject(withoutCodeFence);
    const parsed = JSON.parse(candidate) as TaskMetadataSuggestion;
    return {
      description: typeof parsed.description === "string" ? parsed.description : undefined,
      priority:
        parsed.priority === "low" || parsed.priority === "medium" || parsed.priority === "high"
          ? parsed.priority
          : undefined,
      dueDate:
        typeof parsed.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.dueDate)
          ? parsed.dueDate
          : undefined,
      tags: Array.isArray(parsed.tags)
        ? parsed.tags
            .filter((tag): tag is string => typeof tag === "string")
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0)
        : undefined,
    };
  }

  private extractFirstJsonObject(text: string): string {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("No JSON object found in Gemini response");
    }

    return text.slice(start, end + 1);
  }
}
