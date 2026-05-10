"use client";

import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { trpc } from "@/src/providers/trpc-react-provider";
import { Button } from "@shipyard/ui/components/button";

type MemberRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

interface AcceptInviteCardProps {
  token: string;
  orgName: string;
  role: MemberRole;
}

const roleLabel: Record<MemberRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
  VIEWER: "Viewer",
};

export function AcceptInviteCard({ token, orgName, role }: AcceptInviteCardProps) {
  const router = useRouter();

  const accept = trpc.member.acceptInvitation.useMutation({
    onSuccess: () => router.push("/dashboard"),
  });

  const decline = trpc.member.declineInvitation.useMutation({
    onSuccess: () => router.push("/dashboard"),
  });

  const isPending = accept.isPending || decline.isPending;
  const error = accept.error ?? decline.error;

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Building2 className="size-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">You're invited</h1>
        <p className="text-sm text-muted-foreground">
          Join <strong>{orgName}</strong> as a <strong>{roleLabel[role]}</strong>.
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
          {error.message}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Button
          className="w-full"
          disabled={isPending}
          onClick={() => accept.mutate({ token })}
        >
          {accept.isPending ? "Joining…" : `Join ${orgName}`}
        </Button>
        <Button
          variant="outline"
          className="w-full"
          disabled={isPending}
          onClick={() => decline.mutate({ token })}
        >
          {decline.isPending ? "Declining…" : "Decline invitation"}
        </Button>
      </div>
    </div>
  );
}
