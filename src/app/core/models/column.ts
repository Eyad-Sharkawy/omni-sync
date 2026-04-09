import { OmniSyncColors } from "../../shared/UI/colors";

export interface Column {
  id: string;
  header: string;
  color: OmniSyncColors;
  boardId: string;
  tasksIds: string[];
}
