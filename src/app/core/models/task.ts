import { OmniSyncColors } from "../../shared/UI/colors";

export interface Task {
  id: string;
  title: string;
  tags: TaskTags[];
  priority: "low" | "medium" | "high";
  startDate: Date;
  dueDate: Date;
}

export interface TaskTags {
  id: string;
  text: string;
  color: OmniSyncColors;
}
