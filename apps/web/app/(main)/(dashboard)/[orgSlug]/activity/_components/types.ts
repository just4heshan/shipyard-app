import {
  ArrowRightLeft,
  Building2,
  ClipboardList,
  FolderArchive,
  FolderKanban,
  FolderOpen,
  FolderPlus,
  FolderX,
  MessageSquarePlus,
  MessageSquareX,
  Pencil,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";

export interface LogMember {
  id: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

export interface ActivityLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: unknown;
  createdAt: string;
  member: LogMember;
}

export const ACTION_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType }
> = {
  // Org & member
  ORG_CREATED: { label: "Created org", icon: Building2 },
  MEMBER_INVITED: { label: "Invited member", icon: UserPlus },
  MEMBER_REMOVED: { label: "Removed member", icon: UserMinus },
  MEMBER_ROLE_UPDATED: { label: "Changed role", icon: ShieldCheck },
  INVITATION_ACCEPTED: { label: "Accepted invite", icon: UserCheck },
  INVITATION_CANCELLED: { label: "Cancelled invite", icon: X },
  // Project
  PROJECT_CREATED: { label: "Created project", icon: FolderPlus },
  PROJECT_UPDATED: { label: "Updated project", icon: FolderKanban },
  PROJECT_ARCHIVED: { label: "Archived project", icon: FolderArchive },
  PROJECT_UNARCHIVED: { label: "Unarchived project", icon: FolderOpen },
  PROJECT_DELETED: { label: "Deleted project", icon: FolderX },
  // Task
  TASK_CREATED: { label: "Created task", icon: ClipboardList },
  TASK_UPDATED: { label: "Updated task", icon: Pencil },
  TASK_STATUS_UPDATED: { label: "Moved task", icon: ArrowRightLeft },
  TASK_ASSIGNED: { label: "Assigned task", icon: UserPlus },
  TASK_DELETED: { label: "Deleted task", icon: Trash2 },
  // Comment
  COMMENT_CREATED: { label: "Added comment", icon: MessageSquarePlus },
  COMMENT_DELETED: { label: "Deleted comment", icon: MessageSquareX },
};
