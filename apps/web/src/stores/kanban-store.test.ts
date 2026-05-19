import { mockTask } from "@shipyard/testing";
import { beforeEach, describe, expect, it } from "vitest";
import { useKanbanStore } from "./kanban-store.js";

// The Zustand store is plain JavaScript — no browser, no React, no DOM needed.
// We call store actions directly and assert the resulting state is correct.
//
// beforeEach runs before EVERY test. It resets the store to empty so that
// data from one test never leaks into the next one.

beforeEach(() => {
  useKanbanStore.getState().setTasks([]);
});

// Helper to read the current task list without subscribing to React updates.
function getTasks() {
  return useKanbanStore.getState().tasks;
}

// ---------------------------------------------------------------------------
// setTasks — replaces the entire task list
// Used once on mount to hydrate the store from server-fetched data.
// ---------------------------------------------------------------------------

describe("setTasks", () => {
  it("replaces an empty list with the provided tasks", () => {
    const tasks = [mockTask({ id: "t-1" }), mockTask({ id: "t-2" })];
    useKanbanStore.getState().setTasks(tasks);
    expect(getTasks()).toHaveLength(2);
  });

  it("replaces an existing list entirely", () => {
    useKanbanStore.getState().setTasks([mockTask({ id: "old" })]);
    useKanbanStore
      .getState()
      .setTasks([mockTask({ id: "new-1" }), mockTask({ id: "new-2" })]);
    // The old task must be gone — setTasks is a full replacement, not a merge
    expect(getTasks().find((t) => t.id === "old")).toBeUndefined();
    expect(getTasks()).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// addTask — appends one task to the list
// Used after a successful task.create mutation to update the UI instantly.
// ---------------------------------------------------------------------------

describe("addTask", () => {
  it("appends to an empty list", () => {
    useKanbanStore.getState().addTask(mockTask({ id: "t-1" }));
    expect(getTasks()).toHaveLength(1);
    expect(getTasks()[0]?.id).toBe("t-1");
  });

  it("appends without changing existing tasks", () => {
    useKanbanStore.getState().setTasks([mockTask({ id: "existing" })]);
    useKanbanStore.getState().addTask(mockTask({ id: "new" }));
    expect(getTasks()).toHaveLength(2);
    // "existing" must still be in the list — addTask only appends, never replaces
    expect(getTasks().find((t) => t.id === "existing")).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// updateTask — merges partial changes into one task
// Used after task.update mutation to sync the UI without a full refetch.
// ---------------------------------------------------------------------------

describe("updateTask", () => {
  it("updates the specified field", () => {
    useKanbanStore
      .getState()
      .setTasks([mockTask({ id: "t-1", title: "Old title" })]);
    useKanbanStore.getState().updateTask("t-1", { title: "New title" });
    expect(getTasks().find((t) => t.id === "t-1")?.title).toBe("New title");
  });

  it("preserves fields that were not included in the update", () => {
    useKanbanStore
      .getState()
      .setTasks([mockTask({ id: "t-1", priority: "HIGH", status: "TODO" })]);
    // Only update the title — priority and status must stay untouched
    useKanbanStore.getState().updateTask("t-1", { title: "Changed" });
    const task = getTasks().find((t) => t.id === "t-1");
    expect(task?.priority).toBe("HIGH");
    expect(task?.status).toBe("TODO");
  });

  it("does not affect other tasks", () => {
    useKanbanStore
      .getState()
      .setTasks([
        mockTask({ id: "t-1", title: "Task 1" }),
        mockTask({ id: "t-2", title: "Task 2" }),
      ]);
    useKanbanStore.getState().updateTask("t-1", { title: "Updated" });
    // t-2 must be completely untouched
    expect(getTasks().find((t) => t.id === "t-2")?.title).toBe("Task 2");
  });
});

// ---------------------------------------------------------------------------
// moveTask — changes a task's status and position
// Used for optimistic updates during drag-and-drop across columns.
// ---------------------------------------------------------------------------

describe("moveTask", () => {
  it("updates the task's status", () => {
    useKanbanStore
      .getState()
      .setTasks([mockTask({ id: "t-1", status: "TODO" })]);
    useKanbanStore.getState().moveTask("t-1", "IN_PROGRESS", 0);
    expect(getTasks().find((t) => t.id === "t-1")?.status).toBe("IN_PROGRESS");
  });

  it("updates the task's position", () => {
    useKanbanStore.getState().setTasks([mockTask({ id: "t-1", position: 0 })]);
    useKanbanStore.getState().moveTask("t-1", "DONE", 3);
    expect(getTasks().find((t) => t.id === "t-1")?.position).toBe(3);
  });

  it("does not affect other tasks", () => {
    useKanbanStore
      .getState()
      .setTasks([
        mockTask({ id: "t-1", status: "TODO" }),
        mockTask({ id: "t-2", status: "TODO" }),
      ]);
    useKanbanStore.getState().moveTask("t-1", "DONE", 0);
    expect(getTasks().find((t) => t.id === "t-2")?.status).toBe("TODO");
  });
});

// ---------------------------------------------------------------------------
// reorderTasks — batch-updates positions for multiple tasks
// Used after same-column drag reorder to persist the new order.
// ---------------------------------------------------------------------------

describe("reorderTasks", () => {
  it("updates positions for all listed tasks", () => {
    useKanbanStore
      .getState()
      .setTasks([
        mockTask({ id: "t-1", position: 0 }),
        mockTask({ id: "t-2", position: 1 }),
      ]);
    useKanbanStore.getState().reorderTasks([
      { id: "t-1", position: 1 },
      { id: "t-2", position: 0 },
    ]);
    expect(getTasks().find((t) => t.id === "t-1")?.position).toBe(1);
    expect(getTasks().find((t) => t.id === "t-2")?.position).toBe(0);
  });

  it("does not affect tasks not included in the update list", () => {
    useKanbanStore
      .getState()
      .setTasks([
        mockTask({ id: "t-1", position: 0 }),
        mockTask({ id: "t-2", position: 1 }),
        mockTask({ id: "t-3", position: 2 }),
      ]);
    // Only reorder t-1 and t-2 — t-3 must stay at position 2
    useKanbanStore.getState().reorderTasks([
      { id: "t-1", position: 1 },
      { id: "t-2", position: 0 },
    ]);
    expect(getTasks().find((t) => t.id === "t-3")?.position).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// removeTask — deletes one task by ID
// Used after task.delete mutation to remove the card from the board instantly.
// ---------------------------------------------------------------------------

describe("removeTask", () => {
  it("removes the specified task", () => {
    useKanbanStore
      .getState()
      .setTasks([mockTask({ id: "t-1" }), mockTask({ id: "t-2" })]);
    useKanbanStore.getState().removeTask("t-1");
    expect(getTasks().find((t) => t.id === "t-1")).toBeUndefined();
  });

  it("leaves all other tasks intact", () => {
    useKanbanStore
      .getState()
      .setTasks([mockTask({ id: "t-1" }), mockTask({ id: "t-2" })]);
    useKanbanStore.getState().removeTask("t-1");
    expect(getTasks()).toHaveLength(1);
    expect(getTasks()[0]?.id).toBe("t-2");
  });
});
