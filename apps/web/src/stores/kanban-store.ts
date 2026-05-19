import type { Task as KanbanTask, TaskStatus } from "@shipyard/types/task";
import { create } from "zustand";

/** Alias kept for backward compatibility with existing components. */

interface KanbanStore {
  tasks: KanbanTask[];
  setTasks: (tasks: KanbanTask[]) => void;
  addTask: (task: KanbanTask) => void;
  updateTask: (taskId: string, changes: Partial<KanbanTask>) => void;
  moveTask: (taskId: string, toStatus: TaskStatus, position: number) => void;
  reorderTasks: (updates: { id: string; position: number }[]) => void;
  removeTask: (taskId: string) => void;
}

export const useKanbanStore = create<KanbanStore>((set) => ({
  tasks: [],

  setTasks: (tasks) => set({ tasks }),

  addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),

  updateTask: (taskId, changes) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, ...changes } : t)),
    })),

  moveTask: (taskId, toStatus, position) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId ? { ...t, status: toStatus, position } : t
      ),
    })),

  reorderTasks: (updates) =>
    set((s) => {
      const posMap = new Map(updates.map((u) => [u.id, u.position]));
      return {
        tasks: s.tasks.map((t) =>
          posMap.has(t.id) ? { ...t, position: posMap.get(t.id)! } : t
        ),
      };
    }),

  removeTask: (taskId) =>
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== taskId) })),
}));
