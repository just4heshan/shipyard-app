"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@shipyard/ui/components/avatar";
import { Badge } from "@shipyard/ui/components/badge";
import type { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { userInitials } from "@/lib/userInitials";
import { ACTION_CONFIG, type ActivityLogItem } from "./types";

dayjs.extend(relativeTime);

function formatDetail(action: string, metadata: unknown): string {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata))
    return "—";
  const m = metadata as Record<string, string>;
  switch (action) {
    case "MEMBER_INVITED":
      return `${m.email} as ${capitalize(m.role)}`;
    case "MEMBER_REMOVED":
      return `Was a ${capitalize(m.role)}`;
    case "MEMBER_ROLE_UPDATED":
      return `${capitalize(m.previousRole)} → ${capitalize(m.newRole)}`;
    case "INVITATION_ACCEPTED":
      return `Joined as ${capitalize(m.role)}`;
    case "INVITATION_CANCELLED":
      return `${m.email}`;
    case "ORG_CREATED":
      return `"${m.name}"`;
    case "PROJECT_CREATED":
    case "PROJECT_UPDATED":
    case "PROJECT_ARCHIVED":
    case "PROJECT_UNARCHIVED":
    case "PROJECT_DELETED":
      return m.name ? `"${m.name}"` : "—";
    case "TASK_CREATED":
    case "TASK_UPDATED":
    case "TASK_ASSIGNED":
    case "TASK_DELETED":
      return m.title ? `"${m.title}"` : "—";
    case "TASK_STATUS_UPDATED":
      return m.title ? `"${m.title}": ${m.from} → ${m.to}` : "—";
    case "COMMENT_CREATED":
    case "COMMENT_DELETED":
      return m.taskId ? `On task ${m.taskId.slice(0, 8)}…` : "—";
    default:
      return "—";
  }
}

function capitalize(s: string | undefined): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export const activityLogColumns: ColumnDef<ActivityLogItem>[] = [
  {
    id: "member",
    header: "Who",
    cell: ({ row }) => {
      const { member } = row.original;
      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7 rounded-md shrink-0">
            <AvatarImage
              src={member.user.image ?? ""}
              alt={member.user.name ?? ""}
            />
            <AvatarFallback className="rounded-md text-xs">
              {userInitials(member.user.name, member.user.email)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-tight">
              {member.user.name ?? member.user.email}
            </p>
            {member.user.name && (
              <p className="truncate text-xs text-muted-foreground">
                {member.user.email}
              </p>
            )}
          </div>
        </div>
      );
    },
  },
  {
    id: "action",
    header: "Action",
    cell: ({ row }) => {
      const config = ACTION_CONFIG[row.original.action];
      const Icon = config?.icon;
      return (
        <Badge variant="secondary" className="gap-1.5 font-normal">
          {Icon && <Icon className="size-3" />}
          {config?.label ?? row.original.action}
        </Badge>
      );
    },
  },
  {
    id: "details",
    header: "Details",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatDetail(row.original.action, row.original.metadata)}
      </span>
    ),
  },
  {
    id: "createdAt",
    header: () => <span className="block text-right">When</span>,
    cell: ({ row }) => (
      <span className="block text-right text-sm text-muted-foreground whitespace-nowrap">
        {dayjs(row.original.createdAt).fromNow()}
      </span>
    ),
  },
];
