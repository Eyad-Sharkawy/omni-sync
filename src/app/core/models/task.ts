import {OmniSyncColors} from '../../shared/UI/colors';

export interface Task {
  id: string;
  message: string;
  metaTags: TaskMetaTag[];
  priority: "low" | "medium" | "high";
  startDate?: Date;
  dueDate?: Date;
}

export interface TaskMetaTag {
  id: string;
  text: string;
  color: OmniSyncColors;
}
