import { z } from "zod";
import { TaskStatus, Priority } from "@shipyard/db/enum";
import { router, protectedProcedure } from "../trpc";
import { requireMembership, requireManagerRole } from "../../lib/membership";
import { logActivity, ActivityAction, EntityType } from "../../lib/activityLog";
import {
  assertProjectBelongsToOrg,
  assertTaskBelongsToOrg,
} from "../../lib/projectGuards";

const taskStatusSchema = z.enum([
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.DONE,
  TaskStatus.CANCELLED,
]);

const prioritySchema = z.enum([
  Priority.LOW,
  Priority.MEDIUM,
  Priority.HIGH,
  Priority.URGENT,
]);

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
        status: taskStatusSchema.default(TaskStatus.TODO),
        priority: prioritySchema.default(Priority.MEDIUM),
        assigneeId: z.string().optional(),
        dueDate: z.string().datetime().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const caller = await requireMembership(ctx.db, ctx.session.user.id, input.orgId);
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
      const caller = await requireMembership(ctx.db, ctx.session.user.id, input.orgId);
      const existing = await assertTaskBelongsToOrg(ctx.db, input.taskId, input.orgId);

      const updated = await ctx.db.task.update({
        where: { id: input.taskId },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
          ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}),
          ...(input.dueDate !== undefined
            ? { dueDate: input.dueDate ? new Date(input.dueDate) : null }
            : {}),
        },
        select: taskSelect,
      });

      // Separate audit entry when the assignee changes
      const action =
        input.assigneeId !== undefined && input.assigneeId !== existing.assigneeId
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
      const caller = await requireMembership(ctx.db, ctx.session.user.id, input.orgId);
      const existing = await assertTaskBelongsToOrg(ctx.db, input.taskId, input.orgId);

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
        metadata: { title: existing.title, from: existing.status, to: input.status },
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
      const caller = await requireMembership(ctx.db, ctx.session.user.id, input.orgId);
      requireManagerRole(caller.role);
      const existing = await assertTaskBelongsToOrg(ctx.db, input.taskId, input.orgId);

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
