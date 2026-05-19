"use client";

import { Button } from "@shipyard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@shipyard/ui/components/dialog";
import { Input } from "@shipyard/ui/components/input";
import { Label } from "@shipyard/ui/components/label";
import { Textarea } from "@shipyard/ui/components/textarea";
import { FolderPlus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { UpgradeDialog } from "@/src/components/upgrade-dialog";
import { trpc } from "@/src/providers/trpc-react-provider";

interface CreateProjectDialogProps {
  orgId: string;
  projectLimitReached: boolean;
}

export function CreateProjectDialog({
  orgId,
  projectLimitReached,
}: CreateProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const router = useRouter();
  const params = useParams();
  const orgSlug = typeof params.orgSlug === "string" ? params.orgSlug : "";

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

  if (projectLimitReached) {
    return (
      <>
        <Button size="sm" onClick={() => setUpgradeOpen(true)}>
          <FolderPlus className="size-4" />
          New project
        </Button>
        <UpgradeDialog
          open={upgradeOpen}
          onOpenChange={setUpgradeOpen}
          orgId={orgId}
          orgSlug={orgSlug}
          limitHit="projects"
        />
      </>
    );
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
