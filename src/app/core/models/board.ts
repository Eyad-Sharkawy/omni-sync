import { Column } from "./column";

export interface Board {
  id: string;
  name: string;
  columns: Column[];
  startDate: Date;
  dueDate: Date;
}
