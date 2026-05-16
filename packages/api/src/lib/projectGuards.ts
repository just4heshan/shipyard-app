import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@shipyard/db";

/**
 * Asserts a project exists and belongs to the given org.
 * Throws NOT_FOUND otherwise.
 */
export async function assertProjectBelongsToOrg(
  db: PrismaClient,
  projectId: string,
  orgId: string,
) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { organizationId: true, status: true, name: true },
  });
  if (!project || project.organizationId !== orgId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
  }
  return project;
}

/**
 * Asserts a task exists and belongs to the given org (via its project).
 * Returns the task fields needed for guard checks and audit logging.
 * Throws NOT_FOUND otherwise.
 */
export async function assertTaskBelongsToOrg(
  db: PrismaClient,
  taskId: string,
  orgId: string,
) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    select: {
      title: true,
      status: true,
      assigneeId: true,
      projectId: true,
      project: { select: { organizationId: true } },
    },
  });
  if (!task || task.project.organizationId !== orgId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Task not found." });
  }
  return task;
}
