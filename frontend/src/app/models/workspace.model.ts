export interface IWorkspace {
  workspaceId: string;   // prefijo: ws_
  userId: string;
  name: string;
  icon: string;
  color: string;
  createdAt: string;     // ISO 8601 timestamp
  isDefault: boolean;
}

export type WorkspaceDraft = Omit<IWorkspace, 'workspaceId' | 'createdAt'>;
