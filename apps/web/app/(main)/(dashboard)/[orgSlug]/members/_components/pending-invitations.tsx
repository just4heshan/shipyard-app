"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, X } from "lucide-react";
import { trpc } from "@/src/providers/trpc-react-provider";
import { ConfirmDialog } from "@/src/components/confirm-dialog";
import { Badge } from "@shipyard/ui/components/badge";
import { Button } from "@shipyard/ui/components/button";
import type { MemberRole } from "@shipyard/db/enum";

interface Invitation {
  id: string;
  email: string;
  role: MemberRole;
  createdAt: string;
  expiresAt: string;
  invitedBy: { name: string | null };
}

interface PendingInvitationsProps {
  orgId: string;
  invitations: Invitation[];
}

function daysUntil(dateStr: string) {
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function PendingInvitations({
  orgId,
  invitations,
}: PendingInvitationsProps) {
  const router = useRouter();
  const [confirmInvId, setConfirmInvId] = useState<string | null>(null);

  const cancel = trpc.member.cancelInvitation.useMutation({
    onSuccess: () => {
      setConfirmInvId(null);
      router.refresh();
    },
  });

  if (invitations.length === 0) return null;

  const confirmInv = invitations.find((i) => i.id === confirmInvId);

  return (
    <>
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">
        Pending invitations ({invitations.length})
      </h2>

      <div className="divide-y divide-border rounded-lg border">
        {invitations.map((inv) => (
          <div key={inv.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Clock className="size-4" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{inv.email}</p>
              <p className="text-xs text-muted-foreground">
                Invited by {inv.invitedBy.name ?? "unknown"} · expires in{" "}
                {daysUntil(inv.expiresAt)}d
              </p>
            </div>

            <Badge variant="outline">{inv.role}</Badge>

            <Button
              variant="ghost"
              size="sm"
              className="size-8 p-0 text-muted-foreground hover:text-destructive"
              disabled={cancel.isPending}
              onClick={() => setConfirmInvId(inv.id)}
              title="Cancel invitation"
            >
              <X className="size-4" />
              <span className="sr-only">Cancel</span>
            </Button>
          </div>
        ))}
      </div>
    </section>

    <ConfirmDialog
      open={confirmInvId !== null}
      onOpenChange={(open) => { if (!open) setConfirmInvId(null); }}
      title="Cancel invitation"
      description={`The invitation to ${confirmInv?.email ?? "this address"} will be cancelled.`}
      confirmLabel="Cancel invitation"
      pendingLabel="Cancelling…"
      isPending={cancel.isPending}
      onConfirm={() => {
        if (confirmInvId) cancel.mutate({ orgId, invitationId: confirmInvId });
      }}
    />
    </>
  );
}
