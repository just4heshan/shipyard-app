"use client";

import { useEffect } from "react";
import { useSocket } from "@/src/providers/socket-provider";
import { useKanbanStore } from "@/src/stores/kanban-store";

/**
 * Subscribe to real-time task events for a project room.
 * Emits presence:join on mount and presence:leave on unmount.
 */
export function useSocketTasks(projectId: string) {
  const { socket } = useSocket();
  const { addTask, updateTask, moveTask, reorderTasks, removeTask } =
    useKanbanStore();

  useEffect(() => {
    if (!socket || !projectId) return;

    socket.emit("presence:join", { projectId });

    socket.on("task:created", (data) => {
      if (data.projectId !== projectId) return;
      addTask(data.task);
    });

    socket.on("task:updated", (data) => {
      if (data.projectId !== projectId) return;
      updateTask(data.task.id, data.task);
    });

    socket.on("task:deleted", (data) => {
      if (data.projectId !== projectId) return;
      removeTask(data.taskId);
    });

    socket.on("task:moved", (data) => {
      if (data.projectId !== projectId) return;
      moveTask(data.taskId, data.status, data.position);
    });

    socket.on("task:reordered", (data) => {
      if (data.projectId !== projectId) return;
      reorderTasks(data.tasks);
    });

    return () => {
      socket.emit("presence:leave", { projectId });
      socket.off("task:created");
      socket.off("task:updated");
      socket.off("task:deleted");
      socket.off("task:moved");
      socket.off("task:reordered");
    };
  }, [socket, projectId]);
}
