"use client";

import type { MemberRole } from "@shipyard/db/enum";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shipyard/ui/components/select";
import { UserPlus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { UpgradeDialog } from "@/src/components/upgrade-dialog";
import { trpc } from "@/src/providers/trpc-react-provider";

const ALL_ROLES: { value: MemberRole; label: string }[] = [
  { value: "OWNER", label: "Owner" },
  { value: "ADMIN", label: "Admin" },
  { value: "MEMBER", label: "Member" },
  { value: "VIEWER", label: "Viewer" },
];

interface InviteMemberDialogProps {
  orgId: string;
  callerRole: MemberRole;
  memberLimitReached: boolean;
}

export function InviteMemberDialog({
  orgId,
  callerRole,
  memberLimitReached,
}: InviteMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("MEMBER");
  const canInvite = callerRole === "OWNER" || callerRole === "ADMIN";

  const assignableRoles =
    callerRole === "OWNER"
      ? ALL_ROLES
      : ALL_ROLES.filter((r) => r.value === "MEMBER" || r.value === "VIEWER");

  const router = useRouter();
  const params = useParams();
  const orgSlug = typeof params.orgSlug === "string" ? params.orgSlug : "";

  const invite = trpc.member.invite.useMutation({
    onSuccess: () => {
      setOpen(false);
      setEmail("");
      setRole("MEMBER");
      router.refresh();
    },
  });

  if (!canInvite) return null;

  if (memberLimitReached) {
    return (
      <>
        <Button size="sm" onClick={() => setUpgradeOpen(true)}>
          <UserPlus className="size-4" />
          Invite member
        </Button>
        <UpgradeDialog
          open={upgradeOpen}
          onOpenChange={setUpgradeOpen}
          orgId={orgId}
          orgSlug={orgSlug}
          limitHit="members"
        />
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="size-4" />
          Invite member
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a team member</DialogTitle>
          <DialogDescription>
            They will receive an email with a link to join this organization.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email address</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  invite.mutate({ orgId, email: email.trim(), role });
              }}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invite-role">Role</Label>
            <Select
              value={role}
              onValueChange={(val) => setRole(val as MemberRole)}
            >
              <SelectTrigger id="invite-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assignableRoles.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {invite.error && (
            <p className="text-sm text-destructive">{invite.error.message}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!email.trim() || invite.isPending}
            onClick={() => invite.mutate({ orgId, email: email.trim(), role })}
          >
            {invite.isPending ? "Sending…" : "Send invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
