"use client";

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { Task as KanbanTask, TaskStatus } from "@shipyard/types/task";
import { useEffect, useState } from "react";
import { usePresence } from "@/src/hooks/use-presence";
import { useSocketTasks } from "@/src/hooks/use-socket-tasks";
import { useSocket } from "@/src/providers/socket-provider";
import { trpc } from "@/src/providers/trpc-react-provider";
import { useKanbanStore } from "@/src/stores/kanban-store";
import { KanbanColumn } from "./kanban-column";
import { PresenceAvatars } from "./presence-avatars";
import { TaskCard } from "./task-card";

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "TODO", label: "To Do" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "DONE", label: "Done" },
  { id: "CANCELLED", label: "Cancelled" },
];

interface Member {
  id: string;
  user: { id: string; name: string | null; image: string | null };
}

interface KanbanBoardProps {
  projectId: string;
  orgId: string;
  callerRole: string;
  currentMemberId: string;
  isArchived?: boolean;
  initialTasks: KanbanTask[];
  members: Member[];
}

export function KanbanBoard({
  projectId,
  orgId,
  callerRole,
  currentMemberId,
  isArchived = false,
  initialTasks,
  members,
}: KanbanBoardProps) {
  const { tasks, setTasks, moveTask, reorderTasks } = useKanbanStore();
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);
  const { socket } = useSocket();
  useSocketTasks(projectId);
  const onlineUsers = usePresence(projectId);

  // Hydrate store once on mount
  useEffect(() => {
    setTasks(initialTasks);
  }, [setTasks, initialTasks]); // eslint-disable-line react-hooks/exhaustive-deps

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const updateStatus = trpc.task.updateStatus.useMutation({
    onSuccess: (data) => {
      socket?.emit("task:moved", {
        projectId,
        taskId: data.id,
        status: data.status as TaskStatus,
        position: data.position,
      });
    },
    onError: (_err, vars) => {
      // Revert optimistic move on error
      const prev = initialTasks.find((t) => t.id === vars.taskId);
      if (prev) moveTask(vars.taskId, prev.status, prev.position);
    },
  });

  const reorder = trpc.task.reorder.useMutation({
    onSuccess: (_data, vars) => {
      socket?.emit("task:reordered", {
        projectId,
        tasks: vars.tasks,
      });
    },
  });

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const draggedTask = tasks.find((t) => t.id === active.id);
    if (!draggedTask) return;

    const overId = over.id as string;

    // Dropped onto a column droppable (e.g. column area itself)
    const overColumn = COLUMNS.find((c) => c.id === overId);
    if (overColumn && draggedTask.status !== overColumn.id) {
      const columnTasks = tasks.filter(
        (t) => t.status === overColumn.id && t.id !== draggedTask.id
      );
      const newPosition = columnTasks.length;
      moveTask(draggedTask.id, overColumn.id, newPosition);
      updateStatus.mutate({
        taskId: draggedTask.id,
        orgId,
        status: overColumn.id,
      });
      return;
    }

    // Dropped onto another task — reorder within column or move between columns
    const overTask = tasks.find((t) => t.id === overId);
    if (!overTask) return;

    if (draggedTask.status !== overTask.status) {
      // Cross-column drop onto a task
      const columnTasks = tasks.filter(
        (t) => t.status === overTask.status && t.id !== draggedTask.id
      );
      const insertAt = columnTasks.findIndex((t) => t.id === overTask.id);
      const newPosition = insertAt === -1 ? columnTasks.length : insertAt;
      moveTask(draggedTask.id, overTask.status, newPosition);
      updateStatus.mutate({
        taskId: draggedTask.id,
        orgId,
        status: overTask.status,
      });
    } else {
      // Same-column reorder
      const columnTasks = tasks
        .filter((t) => t.status === draggedTask.status)
        .sort((a, b) => a.position - b.position);

      const fromIdx = columnTasks.findIndex((t) => t.id === draggedTask.id);
      const toIdx = columnTasks.findIndex((t) => t.id === overTask.id);
      if (fromIdx === toIdx) return;

      const reordered = [...columnTasks];
      reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, draggedTask);

      const updates = reordered.map((t, idx) => ({ id: t.id, position: idx }));
      reorderTasks(updates);
      reorder.mutate({ orgId, tasks: updates });
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {onlineUsers.length > 0 && (
        <div className="flex justify-end shrink-0">
          <PresenceAvatars users={onlineUsers} />
        </div>
      )}

      <div className="flex gap-3 overflow-x-auto pb-4 flex-1 min-h-0">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            columnId={col.id}
            label={col.label}
            tasks={tasks
              .filter((t) => t.status === col.id)
              .sort((a, b) => a.position - b.position)}
            projectId={projectId}
            orgId={orgId}
            callerRole={callerRole}
            currentMemberId={currentMemberId}
            isArchived={isArchived}
            members={members}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} isDragging />}
      </DragOverlay>
    </DndContext>
  );
}
