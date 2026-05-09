type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface MockTask {
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

export function mockTask(overrides: Partial<MockTask> = {}): MockTask {
  return {
    id: "task-1",
    title: "Mock Task",
    description: null,
    status: "TODO",
    priority: "MEDIUM",
    position: 0,
    dueDate: null,
    createdAt: "2024-01-01T00:00:00.000Z",
    assignee: null,
    ...overrides,
  };
}
