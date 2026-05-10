export interface Board {
  id: string;
  publicId: string;
  name: string;
  columnsIds: string[];
  startDate: Date;
  dueDate: Date;
  /** Owner-only: Firebase UIDs this board is shared with */
  memberIds?: string[];
  /** Present when this board was loaded from a shared workspace (viewer is not the owner) */
  sharedFromOwnerId?: string;
}
