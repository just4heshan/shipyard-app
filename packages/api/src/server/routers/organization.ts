import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";

// Converts a display name to a URL-safe slug
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const baseSlug = toSlug(input.name);

      if (!baseSlug) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Name must contain at least one valid character.",
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

      return ctx.db.organization.create({
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
    }),

  delete: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Only owners can delete the organization
      const membership = await ctx.db.member.findFirst({
        where: {
          userId: ctx.session.user.id,
          organizationId: input.orgId,
        },
        select: { role: true },
      });

      if (!membership || membership.role !== "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only organization owners can delete the organization.",
        });
      }

      await ctx.db.organization.delete({
        where: { id: input.orgId },
      });

      return { success: true };
    }),
});
