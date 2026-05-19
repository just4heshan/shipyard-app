import type { Prisma, PrismaClient } from "@shipyard/db";
import { logger } from "@shipyard/logger";
import { ActivityAction, EntityType } from "../config/activityLog";

export { ActivityAction, EntityType };

interface LogActivityInput {
  db: PrismaClient;
  orgId: string;
  memberId: string;
  action: ActivityAction;
  entityType: EntityType;
  entityId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Write an audit log entry.
 * Errors are swallowed so a log failure never breaks the calling operation.
 */
export async function logActivity({
  db,
  orgId,
  memberId,
  action,
  entityType,
  entityId,
  metadata,
}: LogActivityInput): Promise<void> {
  try {
    await db.activityLog.create({
      data: {
        organizationId: orgId,
        memberId,
        action,
        entityType,
        entityId,
        ...(metadata !== undefined
          ? { metadata: metadata as Prisma.InputJsonValue }
          : {}),
      },
    });
  } catch (err) {
    logger.error("Failed to write audit log", { err });
  }
}
