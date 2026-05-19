"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task as KanbanTask, TaskPriority } from "@shipyard/types/task";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@shipyard/ui/components/avatar";
import { Badge } from "@shipyard/ui/components/badge";
import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { userInitials } from "@/lib/userInitials";
import { TaskDetailSheet } from "./task-detail-sheet";

const PRIORITY_VARIANT: Record<
  TaskPriority,
  "default" | "secondary" | "outline" | "destructive"
> = {
  LOW: "outline",
  MEDIUM: "secondary",
  HIGH: "default",
  URGENT: "destructive",
};

interface Member {
  id: string;
  user: { id: string; name: string | null; image: string | null };
}

interface TaskCardProps {
  task: KanbanTask;
  projectId?: string;
  orgId?: string;
  callerRole?: string;
  currentMemberId?: string;
  members?: Member[];
  isDragging?: boolean;
  isArchived?: boolean;
}

export function TaskCard({
  task,
  projectId = "",
  orgId = "",
  callerRole = "",
  currentMemberId = "",
  members = [],
  isDragging = false,
  isArchived = false,
}: TaskCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.4 : 1,
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`rounded-md border bg-card p-3 space-y-2 cursor-grab active:cursor-grabbing select-none ${
          isDragging ? "shadow-lg rotate-1" : "hover:shadow-sm"
        }`}
        onClick={() => !isDragging && setDetailOpen(true)}
      >
        {/* Title */}
        <p className="text-sm font-medium leading-snug line-clamp-2">
          {task.title}
        </p>

        {/* Footer row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Badge
              variant={PRIORITY_VARIANT[task.priority]}
              className="text-xs px-1.5 py-0"
            >
              {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
            </Badge>

            {task.dueDate && (
              <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                <CalendarDays className="size-3" />
                {new Date(task.dueDate).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </div>

          {task.assignee && (
            <Avatar className="size-5 shrink-0">
              <AvatarImage
                src={task.assignee.user.image ?? ""}
                alt={task.assignee.user.name ?? ""}
              />
              <AvatarFallback className="text-[10px]">
                {userInitials(task.assignee.user.name, null)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>

      <TaskDetailSheet
        task={task}
        projectId={projectId}
        orgId={orgId}
        callerRole={callerRole}
        currentMemberId={currentMemberId}
        members={members}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        isArchived={isArchived}
      />
    </>
  );
}
