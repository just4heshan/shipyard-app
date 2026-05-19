"use client";

import type { Task as KanbanTask, TaskPriority } from "@shipyard/types/task";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@shipyard/ui/components/avatar";
import { Button } from "@shipyard/ui/components/button";
import { Input } from "@shipyard/ui/components/input";
import { Label } from "@shipyard/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shipyard/ui/components/select";
import { Separator } from "@shipyard/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@shipyard/ui/components/sheet";
import { Textarea } from "@shipyard/ui/components/textarea";
import { useIsMobile } from "@shipyard/ui/hooks/use-mobile";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { userInitials } from "@/lib/userInitials";
import { ConfirmDialog } from "@/src/components/confirm-dialog";
import { useSocket } from "@/src/providers/socket-provider";
import { trpc } from "@/src/providers/trpc-react-provider";
import { useKanbanStore } from "@/src/stores/kanban-store";
import { TaskComments } from "./task-comments";

interface Member {
  id: string;
  user: { id: string; name: string | null; image: string | null };
}

interface TaskDetailSheetProps {
  task: KanbanTask;
  projectId: string;
  orgId: string;
  callerRole: string;
  currentMemberId: string;
  members: Member[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isArchived?: boolean;
}

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

export function TaskDetailSheet({
  task,
  projectId,
  orgId,
  callerRole,
  currentMemberId,
  members,
  open,
  onOpenChange,
  isArchived = false,
}: TaskDetailSheetProps) {
  const isMobile = useIsMobile();
  const { updateTask, removeTask } = useKanbanStore();
  const { socket } = useSocket();
  const router = useRouter();

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [assigneeId, setAssigneeId] = useState<string>(
    task.assignee?.id ?? "none"
  );
  const [dueDate, setDueDate] = useState(
    task.dueDate ? task.dueDate.split("T")[0] : ""
  );
  const [isDirty, setIsDirty] = useState(false);
  const [confirmDeleteTaskOpen, setConfirmDeleteTaskOpen] = useState(false);
  const [confirmUndoChangesOpen, setConfirmUndoChangesOpen] = useState(false);
  const canDelete = callerRole === "OWNER" || callerRole === "ADMIN";

  // Re-sync when a different task is opened
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setPriority(task.priority);
    setAssigneeId(task.assignee?.id ?? "none");
    setDueDate(task.dueDate ? task.dueDate.split("T")[0] : "");
    setIsDirty(false);
  }, [
    task.priority,
    task.description,
    task.title,
    task?.dueDate?.split,
    task.dueDate,
    task.assignee?.id,
  ]);

  const remove = trpc.task.delete.useMutation({
    onSuccess: () => {
      removeTask(task.id);
      socket?.emit("task:deleted", { projectId, taskId: task.id });
      onOpenChange(false);
      router.refresh();
    },
  });

  const update = trpc.task.update.useMutation({
    onSuccess: (updated) => {
      const changes = {
        title: updated.title,
        description: updated.description ?? null,
        priority: updated.priority as TaskPriority,
        assignee: updated.assignee ?? null,
        dueDate: (updated.dueDate as unknown as string | null) ?? null,
      };
      updateTask(task.id, changes);
      socket?.emit("task:updated", {
        projectId,
        task: { ...task, ...changes },
      });
      setIsDirty(false);
      router.refresh();
    },
  });

  function handleSave() {
    update.mutate({
      taskId: task.id,
      orgId,
      title: title.trim() || task.title,
      description: description || null,
      priority,
      assigneeId: assigneeId !== "none" ? assigneeId : null,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
    });
  }

  function handleClose() {
    if (isDirty) {
      setConfirmUndoChangesOpen(true);
    } else {
      onOpenChange(false);
    }
  }

  function handleUndoChangesConfirmed() {
    setTitle("");
    setDescription("");
    setPriority("MEDIUM");
    setAssigneeId("none");
    setDueDate("");
    setIsDirty(false);
    setConfirmUndoChangesOpen(false);
    onOpenChange(false);
  }

  return (
    <>
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={
            isMobile
              ? "overflow-y-auto max-h-[90vh]"
              : "w-full sm:max-w-lg overflow-y-auto"
          }
        >
          <SheetHeader className="pb-2">
            <SheetTitle className="text-base">Task detail</SheetTitle>
          </SheetHeader>

          <Separator />

          <div className="flex flex-col gap-5 p-4">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="detail-title">Title</Label>
              <Input
                id="detail-title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setIsDirty(true);
                }}
                maxLength={255}
                disabled={isArchived}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="detail-desc">Description</Label>
              <Textarea
                id="detail-desc"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setIsDirty(true);
                }}
                rows={4}
                placeholder="Add a description…"
                className="resize-none"
                disabled={isArchived}
              />
            </div>

            {/* Priority + Due date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(v) => {
                    setPriority(v as TaskPriority);
                    setIsDirty(true);
                  }}
                  disabled={isArchived}
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
                <Label htmlFor="detail-due">Due date</Label>
                <Input
                  id="detail-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    setIsDirty(true);
                  }}
                  disabled={isArchived}
                />
              </div>
            </div>

            {/* Assignee */}
            <div className="space-y-1.5">
              <Label>Assignee</Label>
              <Select
                value={assigneeId}
                onValueChange={(v) => {
                  setAssigneeId(v);
                  setIsDirty(true);
                }}
                disabled={isArchived}
              >
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

            {isDirty && !isArchived && (
              <Button
                onClick={handleSave}
                disabled={update.isPending || !title.trim()}
                className="self-end"
              >
                {update.isPending ? "Saving…" : "Save changes"}
              </Button>
            )}

            {update.error && (
              <p className="text-sm text-destructive">{update.error.message}</p>
            )}

            <Separator />

            <TaskComments
              taskId={task.id}
              orgId={orgId}
              callerRole={callerRole}
              currentMemberId={currentMemberId}
              members={members}
              isArchived={isArchived}
            />
          </div>

          {canDelete && !isArchived && (
            <SheetFooter className="px-4 pb-4">
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => setConfirmDeleteTaskOpen(true)}
              >
                <Trash2 className="size-4" />
                Delete task
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmDeleteTaskOpen}
        onOpenChange={setConfirmDeleteTaskOpen}
        title="Delete task"
        description={`"${task.title}" will be permanently deleted along with all its comments.`}
        confirmLabel="Delete task"
        pendingLabel="Deleting…"
        isPending={remove.isPending}
        onConfirm={() => remove.mutate({ taskId: task.id, orgId })}
      />

      <ConfirmDialog
        open={confirmUndoChangesOpen}
        onOpenChange={setConfirmUndoChangesOpen}
        onConfirm={handleUndoChangesConfirmed}
        title="Unsaved changes"
        description="You have unsaved changes. Are you sure you want to close?"
        confirmLabel="Yes, close"
      />
    </>
  );
}
