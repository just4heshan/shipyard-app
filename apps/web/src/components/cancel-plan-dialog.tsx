"use client";

import { Button } from "@shipyard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@shipyard/ui/components/dialog";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { trpc } from "@/src/providers/trpc-react-provider";

interface CancelPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  /** ISO date string — shown to user as the cancellation date */
  periodEnd: string;
  onSuccess: () => void;
}

export function CancelPlanDialog({
  open,
  onOpenChange,
  orgId,
  periodEnd,
  onSuccess,
}: CancelPlanDialogProps) {
  const router = useRouter();
  const cancelMutation = trpc.subscription.cancel.useMutation({
    onSuccess: () => {
      onOpenChange(false);
      onSuccess();
      router.refresh();
    },
  });

  const formattedDate = new Date(periodEnd).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" />
            <DialogTitle>Cancel subscription?</DialogTitle>
          </div>
          <DialogDescription className="space-y-2 text-left">
            <span className="block">
              Your Pro subscription will remain active until{" "}
              <strong>{formattedDate}</strong>. After that, your organization
              will be downgraded to the Free plan.
            </span>
            <span className="block text-muted-foreground text-xs mt-1">
              Projects and members exceeding Free plan limits will become
              read-only. You can reactivate at any time before the cancellation
              date.
            </span>
          </DialogDescription>
        </DialogHeader>

        {cancelMutation.error && (
          <p className="text-sm text-destructive">
            {cancelMutation.error.message}
          </p>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            disabled={cancelMutation.isPending}
            onClick={() => onOpenChange(false)}
          >
            Keep subscription
          </Button>
          <Button
            variant="destructive"
            disabled={cancelMutation.isPending}
            onClick={() => cancelMutation.mutate({ orgId })}
          >
            {cancelMutation.isPending && (
              <Loader2 className="size-4 animate-spin mr-1.5" />
            )}
            {cancelMutation.isPending ? "Cancelling…" : "Cancel subscription"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
