"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus } from "lucide-react";
import { trpc } from "@/src/trpc/react";
import { Button } from "@shipyard/ui/components/button";
import { Input } from "@shipyard/ui/components/input";
import { Label } from "@shipyard/ui/components/label";
import { Textarea } from "@shipyard/ui/components/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@shipyard/ui/components/dialog";

interface CreateProjectDialogProps {
  orgId: string;
}

export function CreateProjectDialog({ orgId }: CreateProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const router = useRouter();

  const create = trpc.project.create.useMutation({
    onSuccess: () => {
      setOpen(false);
      setName("");
      setDescription("");
      router.refresh();
    },
  });

  function handleSubmit() {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    create.mutate({
      orgId,
      name: trimmedName,
      description: description.trim() || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <FolderPlus className="size-4" />
          New project
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Create a project to organize tasks for your team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              placeholder="e.g. Website Redesign"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              autoFocus
              maxLength={100}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="project-description">
              Description{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              id="project-description"
              placeholder="What is this project about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              className="resize-none"
            />
          </div>

          {create.error && (
            <p className="text-sm text-destructive">{create.error.message}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim() || create.isPending}
            onClick={handleSubmit}
          >
            {create.isPending ? "Creating…" : "Create project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
