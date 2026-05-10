"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, ShieldCheck, Trash } from "lucide-react";
import { trpc } from "@/src/providers/trpc-react-provider";
import { ConfirmDialog } from "@/src/components/confirm-dialog";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@shipyard/ui/components/avatar";
import { Badge } from "@shipyard/ui/components/badge";
import { Button } from "@shipyard/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@shipyard/ui/components/dropdown-menu";
import { userInitials } from "@/lib/userInitials";
import type { MemberRole } from "@shipyard/db/enum";

interface Member {
  id: string;
  role: MemberRole;
  joinedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

interface MemberListProps {
  orgId: string;
  members: Member[];
  currentUserId: string;
  callerRole: MemberRole;
}

const ROLE_VARIANT: Record<MemberRole, "default" | "secondary" | "outline"> = {
  OWNER: "default",
  ADMIN: "secondary",
  MEMBER: "outline",
  VIEWER: "outline",
};

export function MemberList({
  orgId,
  members,
  currentUserId,
  callerRole,
}: MemberListProps) {
  const router = useRouter();
  const [confirmMemberId, setConfirmMemberId] = useState<string | null>(null);

  const removeMember = trpc.member.remove.useMutation({
    onSuccess: () => {
      setConfirmMemberId(null);
      router.refresh();
    },
  });
  const updateRole = trpc.member.updateRole.useMutation({
    onSuccess: () => router.refresh(),
  });

  const canManage = callerRole === "OWNER" || callerRole === "ADMIN";

  const confirmMember = members.find((m) => m.id === confirmMemberId);

  return (
    <>
    <div className="divide-y divide-border rounded-lg border">
      {members.map((m) => {
        const isSelf = m.user.id === currentUserId;
        const canRemove =
          canManage &&
          !(isSelf && m.role === "OWNER") &&
          !(
            callerRole === "ADMIN" &&
            (m.role === "OWNER" || m.role === "ADMIN")
          );
        const canChangeRole = callerRole === "OWNER" && m.role !== "OWNER";

        return (
          <div key={m.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar className="h-8 w-8 rounded-lg shrink-0">
              <AvatarImage src={m.user.image ?? ""} alt={m.user.name ?? ""} />
              <AvatarFallback className="rounded-lg text-xs">
                {userInitials(m.user.name, m.user.email)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium leading-tight">
                {m.user.name ?? m.user.email}
                {isSelf && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    (you)
                  </span>
                )}
              </p>
              {m.user.name && (
                <p className="truncate text-xs text-muted-foreground">
                  {m.user.email} &middot; Joined{" "}
                  {new Date(m.joinedAt).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>

            <Badge variant={ROLE_VARIANT[m.role]}>{m.role}</Badge>

            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="size-8 p-0">
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-full">
                  <DropdownMenuLabel>Member actions</DropdownMenuLabel>
                  {canChangeRole && (
                    <>
                      <DropdownMenuSeparator />
                      {(["ADMIN", "MEMBER", "VIEWER"] as MemberRole[])
                        .filter((r) => r !== m.role)
                        .map((r) => (
                          <DropdownMenuItem
                            key={r}
                            onSelect={() =>
                              updateRole.mutate({
                                orgId,
                                memberId: m.id,
                                role: r,
                              })
                            }
                          >
                            <ShieldCheck className="size-4" />
                            Change to {r.charAt(0) + r.slice(1).toLowerCase()}
                          </DropdownMenuItem>
                        ))}
                    </>
                  )}
                  {canRemove && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => setConfirmMemberId(m.id)}
                      >
                        <Trash className="size-4" />
                        Remove member
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      })}
    </div>

    <ConfirmDialog
      open={confirmMemberId !== null}
      onOpenChange={(open) => { if (!open) setConfirmMemberId(null); }}
      title="Remove member"
      description={`${confirmMember?.user.name ?? confirmMember?.user.email ?? "This member"} will be removed from the organization.`}
      confirmLabel="Remove"
      pendingLabel="Removing…"
      isPending={removeMember.isPending}
      onConfirm={() => {
        if (confirmMemberId) removeMember.mutate({ orgId, memberId: confirmMemberId });
      }}
    />
    </>
  );
}
