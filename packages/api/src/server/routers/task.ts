import { z } from "zod";
import type { PrismaClient } from "@shipyard/db";
import { sendEmail, renderTaskAssignedEmail } from "@shipyard/email";
import { router, protectedProcedure } from "../trpc";
import { requireMembership, requireManagerRole, requireContributorRole } from "../../lib/membership";
import { logActivity, ActivityAction, EntityType } from "../../lib/activityLog";
import {
  assertProjectBelongsToOrg,
  assertTaskBelongsToOrg,
} from "../../lib/projectGuards";

const taskStatusSchema = z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]);

const prioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

// Shared select for returning a full task with assignee
const taskSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  position: true,
  dueDate: true,
  createdAt: true,
  assignee: {
    select: {
      id: true,
      user: { select: { name: true, image: true } },
    },
  },
} as const;

export const taskRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string(), orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireMembership(ctx.db, ctx.session.user.id, input.orgId);
      await assertProjectBelongsToOrg(ctx.db, input.projectId, input.orgId);

      return ctx.db.task.findMany({
        where: { projectId: input.projectId },
        select: taskSelect,
        orderBy: { position: "asc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        orgId: z.string(),
        title: z.string().min(1, "Title is required").max(255),
        description: z.string().optional(),
        status: taskStatusSchema.default("TODO"),
        priority: prioritySchema.default("MEDIUM"),
        assigneeId: z.string().optional(),
        dueDate: z.string().datetime().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const caller = await requireMembership(
        ctx.db,
        ctx.session.user.id,
        input.orgId,
      );
      requireContributorRole(caller.role);
      await assertProjectBelongsToOrg(ctx.db, input.projectId, input.orgId);

      // Place at end of the target column
      const last = await ctx.db.task.findFirst({
        where: { projectId: input.projectId, status: input.status },
        select: { position: true },
        orderBy: { position: "desc" },
      });
      const position = (last?.position ?? -1) + 1;

      const task = await ctx.db.task.create({
        data: {
          projectId: input.projectId,
          title: input.title,
          description: input.description,
          status: input.status,
          priority: input.priority,
          assigneeId: input.assigneeId,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
          position,
        },
        select: taskSelect,
      });

      void logActivity({
        db: ctx.db,
        orgId: input.orgId,
        memberId: caller.id,
        action: ActivityAction.TASK_CREATED,
        entityType: EntityType.TASK,
        entityId: task.id,
        metadata: { title: task.title, projectId: input.projectId },
      });

      if (input.assigneeId && input.assigneeId !== caller.id) {
        void sendTaskAssignedEmail(ctx.db, {
          projectId: input.projectId,
          orgId: input.orgId,
          assigneeId: input.assigneeId,
          callerMemberId: caller.id,
          task,
        }).catch((err: unknown) =>
          console.error("[task.create] failed to send task-assigned email:", err),
        );
      }

      return task;
    }),

  update: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        orgId: z.string(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().nullable().optional(),
        priority: prioritySchema.optional(),
        assigneeId: z.string().nullable().optional(),
        dueDate: z.string().datetime().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const caller = await requireMembership(
        ctx.db,
        ctx.session.user.id,
        input.orgId,
      );
      requireContributorRole(caller.role);
      const existing = await assertTaskBelongsToOrg(
        ctx.db,
        input.taskId,
        input.orgId,
      );

      const updated = await ctx.db.task.update({
        where: { id: input.taskId },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
          ...(input.assigneeId !== undefined
            ? { assigneeId: input.assigneeId }
            : {}),
          ...(input.dueDate !== undefined
            ? { dueDate: input.dueDate ? new Date(input.dueDate) : null }
            : {}),
        },
        select: taskSelect,
      });

      // Separate audit entry when the assignee changes
      const action =
        input.assigneeId !== undefined &&
        input.assigneeId !== existing.assigneeId
          ? ActivityAction.TASK_ASSIGNED
          : ActivityAction.TASK_UPDATED;

      void logActivity({
        db: ctx.db,
        orgId: input.orgId,
        memberId: caller.id,
        action,
        entityType: EntityType.TASK,
        entityId: input.taskId,
        metadata: { title: updated.title },
      });

      if (
        action === ActivityAction.TASK_ASSIGNED &&
        input.assigneeId &&
        input.assigneeId !== caller.id
      ) {
        void sendTaskAssignedEmail(ctx.db, {
          projectId: existing.projectId,
          orgId: input.orgId,
          assigneeId: input.assigneeId,
          callerMemberId: caller.id,
          task: updated,
        }).catch((err: unknown) =>
          console.error("[task.update] failed to send task-assigned email:", err),
        );
      }

      return updated;
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        orgId: z.string(),
        status: taskStatusSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const caller = await requireMembership(
        ctx.db,
        ctx.session.user.id,
        input.orgId,
      );
      const existing = await assertTaskBelongsToOrg(
        ctx.db,
        input.taskId,
        input.orgId,
      );

      // Place at end of the target column
      const last = await ctx.db.task.findFirst({
        where: {
          projectId: existing.projectId,
          status: input.status,
          id: { not: input.taskId },
        },
        select: { position: true },
        orderBy: { position: "desc" },
      });
      const position = (last?.position ?? -1) + 1;

      const updated = await ctx.db.task.update({
        where: { id: input.taskId },
        data: { status: input.status, position },
        select: { id: true, status: true, position: true },
      });

      void logActivity({
        db: ctx.db,
        orgId: input.orgId,
        memberId: caller.id,
        action: ActivityAction.TASK_STATUS_UPDATED,
        entityType: EntityType.TASK,
        entityId: input.taskId,
        metadata: {
          title: existing.title,
          from: existing.status,
          to: input.status,
        },
      });

      return updated;
    }),

  reorder: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
        tasks: z.array(
          z.object({ id: z.string(), position: z.number().int().min(0) }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireMembership(ctx.db, ctx.session.user.id, input.orgId);

      await ctx.db.$transaction(
        input.tasks.map((t) =>
          ctx.db.task.update({
            where: { id: t.id },
            data: { position: t.position },
          }),
        ),
      );

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ taskId: z.string(), orgId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const caller = await requireMembership(
        ctx.db,
        ctx.session.user.id,
        input.orgId,
      );
      requireManagerRole(caller.role);
      const existing = await assertTaskBelongsToOrg(
        ctx.db,
        input.taskId,
        input.orgId,
      );

      void logActivity({
        db: ctx.db,
        orgId: input.orgId,
        memberId: caller.id,
        action: ActivityAction.TASK_DELETED,
        entityType: EntityType.TASK,
        entityId: input.taskId,
        metadata: { title: existing.title },
      });

      await ctx.db.task.delete({ where: { id: input.taskId } });
      return { success: true };
    }),
});

// ─── Email helpers ────────────────────────────────────────────────────────────

async function sendTaskAssignedEmail(
  db: PrismaClient,
  opts: {
    projectId: string;
    orgId: string;
    assigneeId: string;
    callerMemberId: string;
    task: {
      id: string;
      title: string;
      description: string | null;
      priority: string;
      dueDate: Date | null;
    };
  },
) {
  const [assignee, assigner, project] = await Promise.all([
    db.member.findUnique({
      where: { id: opts.assigneeId },
      select: { user: { select: { email: true, name: true } } },
    }),
    db.member.findUnique({
      where: { id: opts.callerMemberId },
      select: { user: { select: { name: true } } },
    }),
    db.project.findUnique({
      where: { id: opts.projectId },
      select: { name: true, organization: { select: { name: true, slug: true } } },
    }),
  ]);

  if (!assignee?.user.email || !project) return;

  const assigneeName = assignee.user.name ?? assignee.user.email;
  const assignerName = assigner?.user.name ?? "A teammate";
  const baseUrl = process.env.NEXTAUTH_URL ?? "";
  const taskUrl = `${baseUrl}/${project.organization.slug}/projects/${opts.projectId}`;

  const html = await renderTaskAssignedEmail({
    assigneeName,
    assignerName,
    taskTitle: opts.task.title,
    taskDescription: opts.task.description,
    priority: opts.task.priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
    projectName: project.name,
    orgName: project.organization.name,
    dueDate: opts.task.dueDate?.toISOString() ?? null,
    taskUrl,
  });

  await sendEmail({
    to: assignee.user.email,
    subject: `You've been assigned: ${opts.task.title}`,
    html,
    templateName: "task-assigned",
    templateData: { taskId: opts.task.id, orgId: opts.orgId },
    db,
  });
}
