"use client";

import type { TaskStatus } from "@shipyard/types/task";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@shipyard/ui/components/avatar";
import { Button } from "@shipyard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@shipyard/ui/components/dialog";
import { Input } from "@shipyard/ui/components/input";
import { Label } from "@shipyard/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shipyard/ui/components/select";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { userInitials } from "@/lib/userInitials";
import { useSocket } from "@/src/providers/socket-provider";
import { trpc } from "@/src/providers/trpc-react-provider";
import { useKanbanStore } from "@/src/stores/kanban-store";

interface Member {
  id: string;
  user: { id: string; name: string | null; image: string | null };
}

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  orgId: string;
  defaultStatus: TaskStatus;
  members: Member[];
}

const PRIORITIES = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
] as const;

export function CreateTaskDialog({
  open,
  onOpenChange,
  projectId,
  orgId,
  defaultStatus,
  members,
}: CreateTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<
    "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  >("MEDIUM");
  const [assigneeId, setAssigneeId] = useState<string>("none");
  const [dueDate, setDueDate] = useState("");

  const { addTask } = useKanbanStore();
  const { socket } = useSocket();
  const router = useRouter();

  const create = trpc.task.create.useMutation({
    onSuccess: (task) => {
      const shaped = {
        ...task,
        dueDate: task.dueDate as unknown as string | null,
        createdAt: task.createdAt as unknown as string,
      };
      addTask(shaped);
      socket?.emit("task:created", { projectId, task: shaped });
      onOpenChange(false);
      setTitle("");
      setPriority("MEDIUM");
      setAssigneeId("none");
      setDueDate("");
      router.refresh();
    },
  });

  function handleSubmit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    create.mutate({
      projectId,
      orgId,
      title: trimmed,
      status: defaultStatus,
      priority,
      assigneeId: assigneeId !== "none" ? assigneeId : undefined,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              autoFocus
              maxLength={255}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) =>
                  setPriority(v as "LOW" | "MEDIUM" | "HIGH" | "URGENT")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="task-due">Due date</Label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Assignee</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-5">
                        <AvatarImage
                          src={m.user.image ?? ""}
                          alt={m.user.name ?? ""}
                        />
                        <AvatarFallback className="text-[10px]">
                          {userInitials(m.user.name, null)}
                        </AvatarFallback>
                      </Avatar>
                      {m.user.name ?? m.user.id}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {create.error && (
            <p className="text-sm text-destructive">{create.error.message}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!title.trim() || create.isPending}
            onClick={handleSubmit}
          >
            {create.isPending ? "Creating…" : "Create task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
