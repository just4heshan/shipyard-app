import { z } from "zod";
import { requireManagerRole, requireMembership } from "../../lib/membership";
import { protectedProcedure, router } from "../trpc";

export const activityLogRouter = router({
  /**
   * Paginated audit log for an org.
   * Accessible to OWNER and ADMIN only.
   */
  list: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
        /** Free-text search — matches member name or email */
        search: z.string().optional(),
        /** Filter to a specific entity type (e.g. "MEMBER", "PROJECT") */
        entityType: z.string().optional(),
        /** Cursor = last seen ActivityLog id, for keyset pagination */
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const caller = await requireMembership(
        ctx.db,
        ctx.session.user.id,
        input.orgId
      );
      requireManagerRole(caller.role);

      const logs = await ctx.db.activityLog.findMany({
        where: {
          organizationId: input.orgId,
          ...(input.entityType ? { entityType: input.entityType } : {}),
          ...(input.search
            ? {
                member: {
                  user: {
                    OR: [
                      {
                        name: {
                          contains: input.search,
                          mode: "insensitive",
                        },
                      },
                      {
                        email: {
                          contains: input.search,
                          mode: "insensitive",
                        },
                      },
                    ],
                  },
                },
              }
            : {}),
        },
        cursor: input.cursor ? { id: input.cursor } : undefined,
        skip: input.cursor ? 1 : 0,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          metadata: true,
          createdAt: true,
          member: {
            select: {
              id: true,
              role: true,
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
      });

      const hasMore = logs.length > input.limit;
      const items = hasMore ? logs.slice(0, input.limit) : logs;
      const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

      // Cast metadata to unknown to break Prisma's recursive JsonValue type,
      // which causes "type instantiation excessively deep" in tRPC's useQuery generics.
      return {
        items: items.map((log) => ({
          ...log,
          metadata: log.metadata as unknown,
        })),
        nextCursor,
      };
    }),
});
