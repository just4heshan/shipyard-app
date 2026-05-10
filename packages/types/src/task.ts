// Canonical task entity types — shared across api, web, and socket server.

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

/** Full task shape as returned by the API (dates serialized to ISO strings by tRPC). */
export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  position: number;
  dueDate: string | null;
  createdAt: string;
  assignee: {
    id: string;
    user: { name: string | null; image: string | null };
  } | null;
}
