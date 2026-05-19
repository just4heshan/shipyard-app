import { logger } from "@shipyard/logger";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ORG_OWNER_LIMITS } from "../../config/plans";
import { ActivityAction, EntityType, logActivity } from "../../lib/activityLog";
import { requireMembership } from "../../lib/membership";
import { toSlug } from "../../lib/slug";
import { protectedProcedure, router } from "../trpc";

export const organizationRouter = router({
  getMyOrgs: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.member.findMany({
      where: { userId: ctx.session.user.id },
      select: {
        role: true,
        joinedAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            subscriptionTier: true,
            createdAt: true,
            _count: { select: { members: true, projects: true } },
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2, "Name must be at least 2 characters").max(50),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Enforce per-tier ownership limit.
      // The limit is determined by the highest subscription tier the user holds
      // across all orgs they already own — same logic as the frontend switcher check.
      const ownedOrgs = await ctx.db.member.findMany({
        where: { userId: ctx.session.user.id, role: "OWNER" },
        select: { organization: { select: { subscriptionTier: true } } },
      });

      const ownedCount = ownedOrgs.length;
      const tierOrder: Record<string, number> = {
        FREE: 0,
        PRO: 1,
        ENTERPRISE: 2,
      };
      const highestTier = ownedOrgs.reduce<"FREE" | "PRO" | "ENTERPRISE">(
        (best, m) => {
          const t = m.organization.subscriptionTier;
          return (tierOrder[t] ?? 0) > (tierOrder[best] ?? 0) ? t : best;
        },
        "FREE"
      );
      const limit = ORG_OWNER_LIMITS[highestTier] ?? ORG_OWNER_LIMITS.FREE;

      if (ownedCount >= limit) {
        logger.warn("Org ownership limit reached", {
          userId: ctx.session.user.id,
          ownedCount,
          highestTier,
          limit,
        });
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            highestTier === "FREE"
              ? "Free plan is limited to 1 organization. Upgrade to Pro to create more."
              : `Your plan allows up to ${limit} owned organizations.`,
        });
      }

      const baseSlug = toSlug(input.name);

      if (!baseSlug) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Name must contain at least one valid character.",
        });
      }

      // These slugs conflict with top-level Next.js routes
      const RESERVED_SLUGS = new Set([
        "dashboard",
        "settings",
        "login",
        "signup",
        "register",
        "invite",
        "api",
        "org",
        "admin",
        "auth",
      ]);
      if (RESERVED_SLUGS.has(baseSlug)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `"${baseSlug}" is a reserved name. Please choose a different organization name.`,
        });
      }

      // Append a short random suffix only when the base slug is already taken
      const existing = await ctx.db.organization.findUnique({
        where: { slug: baseSlug },
        select: { id: true },
      });

      const slug = existing
        ? `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`
        : baseSlug;

      const org = await ctx.db.organization.create({
        data: {
          name: input.name,
          slug,
          members: {
            create: {
              userId: ctx.session.user.id,
              role: "OWNER",
            },
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      });

      // Look up the new member record for the audit log
      const callerMember = await ctx.db.member.findUnique({
        where: {
          userId_organizationId: {
            userId: ctx.session.user.id,
            organizationId: org.id,
          },
        },
        select: { id: true },
      });
      if (callerMember) {
        void logActivity({
          db: ctx.db,
          orgId: org.id,
          memberId: callerMember.id,
          action: ActivityAction.ORG_CREATED,
          entityType: EntityType.ORGANIZATION,
          entityId: org.id,
          metadata: { name: input.name },
        });
      }

      return org;
    }),

  delete: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const membership = await requireMembership(
        ctx.db,
        ctx.session.user.id,
        input.orgId
      );

      if (membership.role !== "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only organization owners can delete the organization.",
        });
      }

      // No audit log — cascade delete removes all ActivityLog rows anyway
      await ctx.db.organization.delete({
        where: { id: input.orgId },
      });

      return { success: true };
    }),
});
