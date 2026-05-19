"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Task as KanbanTask, TaskStatus } from "@shipyard/types/task";
import { Badge } from "@shipyard/ui/components/badge";
import { Button } from "@shipyard/ui/components/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { CreateTaskDialog } from "./create-task-dialog";
import { TaskCard } from "./task-card";

interface Member {
  id: string;
  user: { id: string; name: string | null; image: string | null };
}

interface KanbanColumnProps {
  columnId: TaskStatus;
  label: string;
  tasks: KanbanTask[];
  projectId: string;
  orgId: string;
  callerRole: string;
  currentMemberId: string;
  isArchived?: boolean;
  members: Member[];
}

export function KanbanColumn({
  columnId,
  label,
  tasks,
  projectId,
  orgId,
  callerRole,
  currentMemberId,
  isArchived = false,
  members,
}: KanbanColumnProps) {
  const [createOpen, setCreateOpen] = useState(false);

  const { setNodeRef, isOver } = useDroppable({ id: columnId });

  return (
    <div className="flex flex-col gap-2 w-64 shrink-0 h-full">
      {/* Column header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{label}</span>
          <Badge variant="secondary" className="text-xs tabular-nums">
            {tasks.length}
          </Badge>
        </div>
        {!isArchived && (
          <Button
            variant="ghost"
            size="sm"
            className="size-7 p-0"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4" />
            <span className="sr-only">Add task</span>
          </Button>
        )}
      </div>

      {/* Droppable area */}
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 rounded-lg p-2 flex-1 min-h-32 transition-colors ${
          isOver ? "bg-muted" : "bg-muted/40"
        }`}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              projectId={projectId}
              orgId={orgId}
              callerRole={callerRole}
              currentMemberId={currentMemberId}
              members={members}
              isArchived={isArchived}
            />
          ))}
        </SortableContext>

        {/* Empty drop zone at the bottom — always provides a landing area */}
        {!isArchived && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className={`mt-auto flex items-center justify-center gap-1.5 rounded-md border border-dashed py-2 text-xs text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:text-muted-foreground/80 ${
              tasks.length === 0 ? "min-h-16" : "min-h-8"
            }`}
          >
            <Plus className="size-3" />
            Add task
          </button>
        )}
      </div>

      <CreateTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={projectId}
        orgId={orgId}
        defaultStatus={columnId}
        members={members}
      />
    </div>
  );
}
