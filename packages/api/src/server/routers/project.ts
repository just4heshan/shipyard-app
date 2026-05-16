import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { logger } from "@shipyard/logger";
import { PROJECT_LIMITS } from "../../config/plans";
import { requireMembership, requireManagerRole } from "../../lib/membership";
import { logActivity, ActivityAction, EntityType } from "../../lib/activityLog";
import { assertProjectBelongsToOrg } from "../../lib/projectGuards";

export const projectRouter = router({
  list: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireMembership(ctx.db, ctx.session.user.id, input.orgId);

      return ctx.db.project.findMany({
        where: {
          organizationId: input.orgId,
          status: { not: "ARCHIVED" },
        },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          createdAt: true,
          _count: { select: { tasks: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
        name: z.string().min(1, "Name is required").max(100),
        description: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const caller = await requireMembership(
        ctx.db,
        ctx.session.user.id,
        input.orgId,
      );
      requireManagerRole(caller.role);

      const org = await ctx.db.organization.findUnique({
        where: { id: input.orgId },
        select: { subscriptionTier: true },
      });
      if (!org) throw new TRPCError({ code: "NOT_FOUND" });

      const limit = PROJECT_LIMITS[org.subscriptionTier];
      if (limit !== Infinity) {
        const activeCount = await ctx.db.project.count({
          where: {
            organizationId: input.orgId,
            status: { not: "ARCHIVED" },
          },
        });
        if (activeCount >= limit) {
          logger.warn("Project limit reached", {
            orgId: input.orgId,
            tier: org.subscriptionTier,
            activeCount,
            limit,
          });
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Free plan is limited to ${limit} active project. Upgrade to Pro to create more.`,
          });
        }
      }

      const project = await ctx.db.project.create({
        data: {
          organizationId: input.orgId,
          name: input.name,
          description: input.description,
        },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          createdAt: true,
          _count: { select: { tasks: true } },
        },
      });

      void logActivity({
        db: ctx.db,
        orgId: input.orgId,
        memberId: caller.id,
        action: ActivityAction.PROJECT_CREATED,
        entityType: EntityType.PROJECT,
        entityId: project.id,
        metadata: { name: project.name },
      });

      return project;
    }),

  update: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        orgId: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const caller = await requireMembership(
        ctx.db,
        ctx.session.user.id,
        input.orgId,
      );
      requireManagerRole(caller.role);
      await assertProjectBelongsToOrg(ctx.db, input.projectId, input.orgId);

      const project = await ctx.db.project.update({
        where: { id: input.projectId },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
        },
        select: { id: true, name: true, description: true },
      });

      void logActivity({
        db: ctx.db,
        orgId: input.orgId,
        memberId: caller.id,
        action: ActivityAction.PROJECT_UPDATED,
        entityType: EntityType.PROJECT,
        entityId: project.id,
        metadata: { name: project.name },
      });

      return project;
    }),

  archive: protectedProcedure
    .input(z.object({ projectId: z.string(), orgId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const caller = await requireMembership(
        ctx.db,
        ctx.session.user.id,
        input.orgId,
      );
      requireManagerRole(caller.role);
      await assertProjectBelongsToOrg(ctx.db, input.projectId, input.orgId);

      const project = await ctx.db.project.update({
        where: { id: input.projectId },
        data: { status: "ARCHIVED" },
        select: { id: true, name: true },
      });

      void logActivity({
        db: ctx.db,
        orgId: input.orgId,
        memberId: caller.id,
        action: ActivityAction.PROJECT_ARCHIVED,
        entityType: EntityType.PROJECT,
        entityId: project.id,
        metadata: { name: project.name },
      });

      return project;
    }),

  unarchive: protectedProcedure
    .input(z.object({ projectId: z.string(), orgId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const caller = await requireMembership(
        ctx.db,
        ctx.session.user.id,
        input.orgId,
      );
      requireManagerRole(caller.role);
      await assertProjectBelongsToOrg(ctx.db, input.projectId, input.orgId);

      // Unarchiving restores to ACTIVE — enforce the active project limit first
      const org = await ctx.db.organization.findUnique({
        where: { id: input.orgId },
        select: { subscriptionTier: true },
      });
      if (!org) throw new TRPCError({ code: "NOT_FOUND" });

      const limit = PROJECT_LIMITS[org.subscriptionTier];
      if (limit !== Infinity) {
        const activeCount = await ctx.db.project.count({
          where: { organizationId: input.orgId, status: { not: "ARCHIVED" } },
        });
        if (activeCount >= limit) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Cannot unarchive: you've reached the ${limit} active project limit for your plan. Archive another project first.`,
          });
        }
      }

      const project = await ctx.db.project.update({
        where: { id: input.projectId },
        data: { status: "ACTIVE" },
        select: { id: true, name: true },
      });

      void logActivity({
        db: ctx.db,
        orgId: input.orgId,
        memberId: caller.id,
        action: ActivityAction.PROJECT_UNARCHIVED,
        entityType: EntityType.PROJECT,
        entityId: project.id,
        metadata: { name: project.name },
      });

      return project;
    }),

  delete: protectedProcedure
    .input(z.object({ projectId: z.string(), orgId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const caller = await requireMembership(
        ctx.db,
        ctx.session.user.id,
        input.orgId,
      );
      if (caller.role !== "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners can delete projects.",
        });
      }
      await assertProjectBelongsToOrg(ctx.db, input.projectId, input.orgId);

      // Log before delete so the entity still exists if the log write races
      void logActivity({
        db: ctx.db,
        orgId: input.orgId,
        memberId: caller.id,
        action: ActivityAction.PROJECT_DELETED,
        entityType: EntityType.PROJECT,
        entityId: input.projectId,
      });

      await ctx.db.project.delete({ where: { id: input.projectId } });
      return { success: true };
    }),
});
