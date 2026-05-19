import type { PrismaClient } from "@shipyard/db";
import type { MemberRole } from "@shipyard/db/enum";
import { TRPCError } from "@trpc/server";

/** Assert caller is a member of the org and return their membership. */
export async function requireMembership(
  db: PrismaClient,
  userId: string,
  orgId: string
) {
  const membership = await db.member.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
    select: { id: true, role: true },
  });
  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not a member of this organization.",
    });
  }
  return membership;
}

/** Assert caller is OWNER or ADMIN. */
export function requireManagerRole(role: MemberRole) {
  if (role !== "OWNER" && role !== "ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only owners and admins can perform this action.",
    });
  }
}

/** Assert caller is OWNER. Used for billing and subscription management. */
export function requireOwner(role: MemberRole | string) {
  if (role !== "OWNER") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only organization owners can manage billing.",
    });
  }
}

/** Assert caller is at least MEMBER (blocks VIEWER). */
export function requireContributorRole(role: MemberRole) {
  if (role === "VIEWER") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Viewers cannot perform this action.",
    });
  }
}
