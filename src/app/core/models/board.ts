export interface Board {
  id: string;
  publicId: string;
  name: string;
  columnsIds: string[];
  startDate: Date;
  dueDate: Date;
}
