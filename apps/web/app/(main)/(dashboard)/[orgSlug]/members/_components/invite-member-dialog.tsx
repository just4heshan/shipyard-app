"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shipyard/ui/components/select";
import type { MemberRole } from "@shipyard/db/enum";

const ALL_ROLES: { value: MemberRole; label: string }[] = [
  { value: "OWNER", label: "Owner" },
  { value: "ADMIN", label: "Admin" },
  { value: "MEMBER", label: "Member" },
  { value: "VIEWER", label: "Viewer" },
];

interface InviteMemberDialogProps {
  orgId: string;
  callerRole: MemberRole;
}

export function InviteMemberDialog({
  orgId,
  callerRole,
}: InviteMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"OWNER" | "ADMIN" | "MEMBER" | "VIEWER">(
    "MEMBER",
  );
  const canInvite = callerRole === "OWNER" || callerRole === "ADMIN";

  const assignableRoles =
    callerRole === "OWNER"
      ? ALL_ROLES
      : ALL_ROLES.filter((r) => r.value === "MEMBER" || r.value === "VIEWER");

  const router = useRouter();

  const invite = trpc.member.invite.useMutation({
    onSuccess: () => {
      setOpen(false);
      setEmail("");
      setRole("MEMBER");
      router.refresh();
    },
  });

  function handleSubmit() {
    const trimmed = email.trim();
    if (trimmed) invite.mutate({ orgId, email: trimmed, role });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {canInvite && (
        <DialogTrigger asChild>
          <Button size="sm">
            <UserPlus className="size-4" />
            Invite member
          </Button>
        </DialogTrigger>
      )}

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
                if (e.key === "Enter") handleSubmit();
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
            onClick={handleSubmit}
          >
            {invite.isPending ? "Sending…" : "Send invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
