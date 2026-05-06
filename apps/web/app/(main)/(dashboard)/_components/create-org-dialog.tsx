"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { trpc } from "@/src/trpc/react";
import { Button } from "@shipyard/ui/components/button";
import { Input } from "@shipyard/ui/components/input";
import { Label } from "@shipyard/ui/components/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@shipyard/ui/components/dialog";
import { toSlugPreview } from "@/lib/toSlugPreview";

interface CreateOrgDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Pass true when the user has reached their plan's org ownership limit */
  atLimit?: boolean;
}

export function CreateOrgDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  atLimit = false,
}: CreateOrgDialogProps = {}) {
  const router = useRouter();
  const [localOpen, setLocalOpen] = useState(false);
  const [name, setName] = useState("");

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen! : localOpen;

  function handleOpenChange(value: boolean) {
    if (!value) setName(""); // reset form when closing
    if (isControlled) {
      controlledOnOpenChange?.(value);
    } else {
      setLocalOpen(value);
    }
  }

  const createOrg = trpc.organization.create.useMutation({
    onSuccess: () => {
      router.refresh();
      handleOpenChange(false);
    },
  });

  const slugPreview = toSlugPreview(name);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {/* Trigger only rendered in standalone mode (e.g. dashboard page) */}
      {!isControlled && (
        <DialogTrigger asChild disabled={atLimit}>
          <Button
            variant="outline"
            size="sm"
            disabled={atLimit}
            title={atLimit ? "Free plan is limited to 1 organization. Upgrade to Pro." : undefined}
          >
            <Plus className="size-4" />
            New organization
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create organization</DialogTitle>
          <DialogDescription>
            Organizations group your projects and team members.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="org-name">Name</Label>
            <Input
              id="org-name"
              placeholder="Acme Inc"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim().length >= 2) {
                  createOrg.mutate({ name: name.trim() });
                }
              }}
              autoFocus
            />
            {slugPreview && (
              <p className="text-xs text-muted-foreground">
                URL: <span className="font-mono">/{slugPreview}</span>
              </p>
            )}
          </div>

          {createOrg.error && (
            <p className="text-sm text-destructive">
              {createOrg.error.message}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={name.trim().length < 2 || createOrg.isPending}
            onClick={() => createOrg.mutate({ name: name.trim() })}
          >
            {createOrg.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
