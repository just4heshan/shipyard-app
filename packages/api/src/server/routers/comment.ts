import type { PrismaClient } from "@shipyard/db";
import { renderCommentMentionEmail, sendEmail } from "@shipyard/email";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ActivityAction, EntityType, logActivity } from "../../lib/activityLog";
import {
  requireContributorRole,
  requireMembership,
} from "../../lib/membership";
import { assertTaskBelongsToOrg } from "../../lib/projectGuards";
import { protectedProcedure, router } from "../trpc";

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
      })
    )
    .mutation(async ({ ctx, input }) => {
      const caller = await requireMembership(
        ctx.db,
        ctx.session.user.id,
        input.orgId
      );
      requireContributorRole(caller.role);
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

      const mentionIds = extractMentionIds(input.content);
      if (mentionIds.length > 0) {
        void sendMentionEmails(ctx.db, {
          orgId: input.orgId,
          taskId: input.taskId,
          callerMemberId: caller.id,
          mentionIds,
          comment,
        }).catch((err: unknown) =>
          console.error("[comment.create] failed to send mention emails:", err)
        );
      }

      return comment;
    }),

  delete: protectedProcedure
    .input(z.object({ commentId: z.string(), orgId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const caller = await requireMembership(
        ctx.db,
        ctx.session.user.id,
        input.orgId
      );

      const comment = await ctx.db.comment.findUnique({
        where: { id: input.commentId },
        select: {
          authorId: true,
          task: { select: { project: { select: { organizationId: true } } } },
        },
      });

      if (!comment || comment.task.project.organizationId !== input.orgId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comment not found.",
        });
      }

      // Only the comment author, or an OWNER/ADMIN, can delete
      const isAuthor = comment.authorId === caller.id;
      const isManager = caller.role === "OWNER" || caller.role === "ADMIN";

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

// ─── Email helpers ────────────────────────────────────────────────────────────

/**
 * Extract member IDs from @[Display Name|memberId] tokens.
 * Returns deduplicated IDs — unambiguous regardless of name collisions or future renames.
 */
function extractMentionIds(content: string): string[] {
  const matches = [...content.matchAll(/@\[([^|]+)\|([^\]]+)\]/g)];
  return [
    ...new Set(
      matches.map((m) => m[2]).filter((id): id is string => id !== undefined)
    ),
  ];
}

async function sendMentionEmails(
  db: PrismaClient,
  opts: {
    orgId: string;
    taskId: string;
    callerMemberId: string;
    mentionIds: string[];
    comment: {
      id: string;
      content: string;
      createdAt: Date;
      author: { user: { name: string | null } };
    };
  }
) {
  const [members, taskWithProject] = await Promise.all([
    // Fetch only the explicitly mentioned members by ID — no name matching
    db.member.findMany({
      where: {
        id: { in: opts.mentionIds },
        organizationId: opts.orgId,
      },
      select: { id: true, user: { select: { email: true, name: true } } },
    }),
    db.task.findUnique({
      where: { id: opts.taskId },
      select: {
        title: true,
        projectId: true,
        project: {
          select: {
            name: true,
            organization: { select: { name: true, slug: true } },
          },
        },
      },
    }),
  ]);

  if (!taskWithProject?.project) return;

  const { title: taskTitle, projectId, project } = taskWithProject;
  const authorName = opts.comment.author.user.name ?? "A teammate";
  const baseUrl = process.env.NEXTAUTH_URL ?? "";
  const taskUrl = `${baseUrl}/${project.organization.slug}/projects/${projectId}`;

  // Exclude the author (they mentioned themselves)
  const mentionedMembers = members.filter((m) => m.id !== opts.callerMemberId);

  await Promise.all(
    mentionedMembers.map(async (m) => {
      if (!m.user.email) return;
      const html = await renderCommentMentionEmail({
        mentionedName: m.user.name ?? m.user.email,
        authorName,
        commentText: opts.comment.content,
        taskTitle,
        projectName: project.name,
        orgName: project.organization.name,
        taskUrl,
        createdAt: opts.comment.createdAt.toISOString(),
      });
      await sendEmail({
        to: m.user.email,
        subject: `${authorName} mentioned you in a comment`,
        html,
        templateName: "comment-mention",
        templateData: {
          commentId: opts.comment.id,
          taskId: opts.taskId,
          orgId: opts.orgId,
        },
        db,
      });
    })
  );
}
