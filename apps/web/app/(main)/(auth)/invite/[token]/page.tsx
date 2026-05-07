import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { db } from "@shipyard/db";
import { AcceptInviteCard } from "./_components/accept-invite-card";
import { SwitchAccountButton } from "./_components/switch-account-button";

export const metadata: Metadata = { title: "Accept invitation" };

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const session = await auth();
  if (!session) redirect(`/login?callbackUrl=/invite/${token}`);

  const invitation = await db.invitation.findUnique({
    where: { token },
    select: {
      email: true,
      role: true,
      acceptedAt: true,
      expiresAt: true,
      organization: { select: { name: true } },
    },
  });

  // Invalid or already accepted
  if (!invitation || invitation.acceptedAt) {
    return (
      <div className="w-full max-w-sm space-y-2 text-center">
        <h1 className="text-xl font-bold">Invalid invitation</h1>
        <p className="text-sm text-muted-foreground">
          This invitation link is invalid or has already been used.
        </p>
      </div>
    );
  }

  // Expired
  if (invitation.expiresAt < new Date()) {
    return (
      <div className="w-full max-w-sm space-y-2 text-center">
        <h1 className="text-xl font-bold">Invitation expired</h1>
        <p className="text-sm text-muted-foreground">
          This invitation has expired. Ask the organization owner to send a new one.
        </p>
      </div>
    );
  }

  // Wrong account
  if (invitation.email !== session.user.email) {
    return (
      <div className="w-full max-w-sm space-y-4 text-center">
        <div className="space-y-2">
          <h1 className="text-xl font-bold">Wrong account</h1>
          <p className="text-sm text-muted-foreground">
            This invitation was sent to{" "}
            <strong>{invitation.email}</strong>. Sign in with that account to
            accept.
          </p>
        </div>
        <SwitchAccountButton token={token} />
      </div>
    );
  }

  return (
    <AcceptInviteCard
      token={token}
      orgName={invitation.organization.name}
      role={invitation.role}
    />
  );
}
