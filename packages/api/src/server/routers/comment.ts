import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { MemberRole } from "@shipyard/db/enum";
import { router, protectedProcedure } from "../trpc";
import { requireMembership } from "../../lib/membership";
import { logActivity, ActivityAction, EntityType } from "../../lib/activityLog";
import { assertTaskBelongsToOrg } from "../../lib/projectGuards";

export const commentRouter = router({
  list: protectedProcedure
    .input(z.object({ taskId: z.string(), orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireMembership(ctx.db, ctx.session.user.id, input.orgId);
      await assertTaskBelongsToOrg(ctx.db, input.taskId, input.orgId);

      return ctx.db.comment.findMany({
        where: { taskId: input.taskId },
        select: {
          id: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          author: {
            select: {
              id: true,
              user: { select: { name: true, image: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        orgId: z.string(),
        content: z.string().min(1, "Comment cannot be empty").max(5000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const caller = await requireMembership(ctx.db, ctx.session.user.id, input.orgId);
      await assertTaskBelongsToOrg(ctx.db, input.taskId, input.orgId);

      const comment = await ctx.db.comment.create({
        data: {
          taskId: input.taskId,
          authorId: caller.id,
          content: input.content,
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          author: {
            select: {
              id: true,
              user: { select: { name: true, image: true } },
            },
          },
        },
      });

      void logActivity({
        db: ctx.db,
        orgId: input.orgId,
        memberId: caller.id,
        action: ActivityAction.COMMENT_CREATED,
        entityType: EntityType.COMMENT,
        entityId: comment.id,
        metadata: { taskId: input.taskId },
      });

      return comment;
    }),

  delete: protectedProcedure
    .input(z.object({ commentId: z.string(), orgId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const caller = await requireMembership(ctx.db, ctx.session.user.id, input.orgId);

      const comment = await ctx.db.comment.findUnique({
        where: { id: input.commentId },
        select: {
          authorId: true,
          task: { select: { project: { select: { organizationId: true } } } },
        },
      });

      if (!comment || comment.task.project.organizationId !== input.orgId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Comment not found." });
      }

      // Only the comment author, or an OWNER/ADMIN, can delete
      const isAuthor = comment.authorId === caller.id;
      const isManager =
        caller.role === MemberRole.OWNER || caller.role === MemberRole.ADMIN;

      if (!isAuthor && !isManager) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own comments.",
        });
      }

      void logActivity({
        db: ctx.db,
        orgId: input.orgId,
        memberId: caller.id,
        action: ActivityAction.COMMENT_DELETED,
        entityType: EntityType.COMMENT,
        entityId: input.commentId,
      });

      await ctx.db.comment.delete({ where: { id: input.commentId } });
      return { success: true };
    }),
});
