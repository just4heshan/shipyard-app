import { db } from "@shipyard/db";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";

interface RedirectOptions {
  /** Redirect when the user is not authenticated. Default: "/login" */
  unauthenticated?: string;
  /** Redirect when the user is not a member of the org. Default: "/dashboard" */
  notMember?: string;
}

/**
 * Verifies the current user is authenticated and is a member of the org
 * identified by its URL slug. Redirects on failure; returns session +
 * membership on success.
 */
export async function requireOrgMembership(
  orgSlug: string,
  redirects?: RedirectOptions
) {
  const session = await auth();
  if (!session) redirect(redirects?.unauthenticated ?? "/login");

  // Single JOIN query — Prisma uses Organization.slug unique index +
  // Member.userId index in one round trip.
  const member = await db.member.findFirst({
    where: {
      userId: session.user.id,
      organization: { slug: orgSlug },
    },
    select: {
      id: true,
      role: true,
      organization: {
        select: { id: true, name: true, slug: true, subscriptionTier: true },
      },
    },
  });
  if (!member) redirect(redirects?.notMember ?? "/dashboard");

  return {
    session,
    membership: {
      id: member.id,
      role: member.role,
      organization: member.organization,
    },
  };
}
