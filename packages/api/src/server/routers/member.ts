import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { sendEmail, renderInviteEmail } from "@shipyard/email";
import { router, protectedProcedure } from "../trpc";
import { logger } from "@shipyard/logger";
import { MEMBER_LIMITS } from "../../config/plans";
import { requireMembership, requireManagerRole } from "../../lib/membership";
import { logActivity, ActivityAction, EntityType } from "../../lib/activityLog";

// ─── router ─────────────────────────────────────────────────────────────────

const INVITE_EXPIRY_DAYS = 7;

export const memberRouter = router({
  /** List all members of an org with user details. */
  list: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireMembership(ctx.db, ctx.session.user.id, input.orgId);
      return ctx.db.member.findMany({
        where: { organizationId: input.orgId },
        select: {
          id: true,
          role: true,
          joinedAt: true,
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { joinedAt: "asc" },
      });
    }),

  /** Remove a member from the org. */
  remove: protectedProcedure
    .input(z.object({ orgId: z.string(), memberId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const caller = await requireMembership(
        ctx.db,
        ctx.session.user.id,
        input.orgId,
      );
      requireManagerRole(caller.role);

      const target = await ctx.db.member.findUnique({
        where: { id: input.memberId },
        select: { role: true, userId: true },
      });
      if (!target)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member not found.",
        });

      // OWNER cannot remove themselves (would leave org ownerless)
      if (target.userId === ctx.session.user.id && target.role === "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You cannot remove yourself as the owner.",
        });
      }
      // ADMIN cannot remove other ADMINs or OWNERs
      if (
        caller.role === "ADMIN" &&
        (target.role === "OWNER" || target.role === "ADMIN")
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admins cannot remove owners or other admins.",
        });
      }

      await ctx.db.member.delete({ where: { id: input.memberId } });

      void logActivity({
        db: ctx.db,
        orgId: input.orgId,
        memberId: caller.id,
        action: ActivityAction.MEMBER_REMOVED,
        entityType: EntityType.MEMBER,
        entityId: input.memberId,
        metadata: { removedUserId: target.userId, role: target.role },
      });

      return { success: true };
    }),

  /** Update a member's role. OWNER only. */
  updateRole: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
        memberId: z.string(),
        role: z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const caller = await requireMembership(
        ctx.db,
        ctx.session.user.id,
        input.orgId,
      );
      if (caller.role !== "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners can change member roles.",
        });
      }

      const target = await ctx.db.member.findUnique({
        where: { id: input.memberId },
        select: { role: true, userId: true },
      });
      if (!target)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member not found.",
        });

      // Prevent demoting the last owner
      if (target.role === "OWNER" && input.role !== "OWNER") {
        const ownerCount = await ctx.db.member.count({
          where: { organizationId: input.orgId, role: "OWNER" },
        });
        if (ownerCount <= 1) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Cannot demote the last owner.",
          });
        }
      }

      const updated = await ctx.db.member.update({
        where: { id: input.memberId },
        data: { role: input.role },
        select: { id: true, role: true },
      });

      void logActivity({
        db: ctx.db,
        orgId: input.orgId,
        memberId: caller.id,
        action: ActivityAction.MEMBER_ROLE_UPDATED,
        entityType: EntityType.MEMBER,
        entityId: input.memberId,
        metadata: { previousRole: target.role, newRole: input.role },
      });

      return updated;
    }),

  /** Cancel a pending invitation. */
  cancelInvitation: protectedProcedure
    .input(z.object({ orgId: z.string(), invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const caller = await requireMembership(
        ctx.db,
        ctx.session.user.id,
        input.orgId,
      );
      requireManagerRole(caller.role);

      // Fetch first so we have metadata and confirm it belongs to this org
      const invitation = await ctx.db.invitation.findUnique({
        where: { id: input.invitationId, organizationId: input.orgId },
        select: { email: true, role: true },
      });
      if (!invitation)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found.",
        });

      await ctx.db.invitation.delete({ where: { id: input.invitationId } });

      void logActivity({
        db: ctx.db,
        orgId: input.orgId,
        memberId: caller.id,
        action: ActivityAction.INVITATION_CANCELLED,
        entityType: EntityType.INVITATION,
        entityId: input.invitationId,
        metadata: { email: invitation.email, role: invitation.role },
      });

      return { success: true };
    }),

  /** Invite a user by email with a role. Sends the invitation email. */
  invite: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
        email: z.email("Invalid email address"),
        role: z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const caller = await requireMembership(
        ctx.db,
        ctx.session.user.id,
        input.orgId,
      );
      requireManagerRole(caller.role);

      // ADMIN can only assign MEMBER or VIEWER
      if (
        caller.role === "ADMIN" &&
        !(input.role === "MEMBER" || input.role === "VIEWER")
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admins can only invite members or viewers.",
        });
      }

      const org = await ctx.db.organization.findUniqueOrThrow({
        where: { id: input.orgId },
        select: { name: true, subscriptionTier: true },
      });

      // Seat limit: count active members + pending invitations
      const [memberCount, pendingCount] = await Promise.all([
        ctx.db.member.count({ where: { organizationId: input.orgId } }),
        ctx.db.invitation.count({
          where: {
            organizationId: input.orgId,
            acceptedAt: null,
            expiresAt: { gt: new Date() },
          },
        }),
      ]);

      const limit = MEMBER_LIMITS[org.subscriptionTier];
      if (memberCount + pendingCount >= limit) {
        logger.warn("Member seat limit reached", {
          orgId: input.orgId,
          tier: org.subscriptionTier,
          count: memberCount + pendingCount,
          limit,
        });
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `${org.subscriptionTier === "FREE" ? "Free" : "Pro"} plan is limited to ${limit} members. Upgrade to add more.`,
        });
      }

      // Check if already a member in the org
      const existingUser = await ctx.db.user.findUnique({
        where: { email: input.email },
        select: { id: true },
      });
      if (existingUser) {
        const isMember = await ctx.db.member.findUnique({
          where: {
            userId_organizationId: {
              userId: existingUser.id,
              organizationId: input.orgId,
            },
          },
          select: { id: true },
        });
        if (isMember) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This person is already a member of the organization.",
          });
        }
      }

      // Upsert invitation — refreshes token + expiry on resend
      const expiresAt = new Date(
        Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
      );
      const invitation = await ctx.db.invitation.upsert({
        where: {
          organizationId_email: {
            organizationId: input.orgId,
            email: input.email,
          },
        },
        update: {
          role: input.role,
          token: crypto.randomUUID(),
          expiresAt,
          invitedById: ctx.session.user.id,
          acceptedAt: null,
        },
        create: {
          organizationId: input.orgId,
          email: input.email,
          role: input.role,
          expiresAt,
          invitedById: ctx.session.user.id,
        },
        select: { token: true, id: true },
      });

      const inviterName =
        ctx.session.user.name ?? ctx.session.user.email ?? "Someone";
      const inviterEmail = ctx.session.user.email ?? "";
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const inviteUrl = `${baseUrl}/invite/${invitation.token}`;

      const templateData = {
        inviterName,
        inviterEmail,
        orgName: org.name,
        role: input.role,
        inviteUrl,
        expiryDays: INVITE_EXPIRY_DAYS,
      };

      await sendEmail({
        to: input.email,
        subject: `${inviterName} invited you to join ${org.name} on Shipyard`,
        html: await renderInviteEmail(templateData),
        templateName: "invite",
        templateData,
        db: ctx.db,
      });

      void logActivity({
        db: ctx.db,
        orgId: input.orgId,
        memberId: caller.id,
        action: ActivityAction.MEMBER_INVITED,
        entityType: EntityType.INVITATION,
        entityId: invitation.id,
        metadata: { email: input.email, role: input.role },
      });

      return { success: true };
    }),

  /** Decline an invitation by token. Deletes it so the invite slot is freed. */
  declineInvitation: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invitation = await ctx.db.invitation.findUnique({
        where: { token: input.token },
        select: { id: true, email: true, acceptedAt: true },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found.",
        });
      }
      if (invitation.acceptedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation has already been accepted.",
        });
      }
      if (invitation.email !== ctx.session.user.email) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This invitation was sent to a different email address.",
        });
      }

      // Decliner has no member record in this org — skip audit log
      await ctx.db.invitation.delete({ where: { id: invitation.id } });
      return { success: true };
    }),

  /** Accept an invitation by token. Returns orgId for client-side redirect. */
  acceptInvitation: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invitation = await ctx.db.invitation.findUnique({
        where: { token: input.token },
        select: {
          id: true,
          organizationId: true,
          email: true,
          role: true,
          acceptedAt: true,
          expiresAt: true,
        },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found.",
        });
      }
      if (invitation.acceptedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation has already been accepted.",
        });
      }
      if (invitation.expiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation has expired.",
        });
      }
      if (invitation.email !== ctx.session.user.email) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This invitation was sent to a different email address.",
        });
      }

      // Add member + mark accepted atomically
      await ctx.db.$transaction([
        ctx.db.member.create({
          data: {
            userId: ctx.session.user.id,
            organizationId: invitation.organizationId,
            role: invitation.role,
          },
        }),
        ctx.db.invitation.update({
          where: { id: invitation.id },
          data: { acceptedAt: new Date() },
        }),
      ]);

      // Look up new member id for the audit log
      const newMember = await ctx.db.member.findUnique({
        where: {
          userId_organizationId: {
            userId: ctx.session.user.id,
            organizationId: invitation.organizationId,
          },
        },
        select: { id: true },
      });
      if (newMember) {
        void logActivity({
          db: ctx.db,
          orgId: invitation.organizationId,
          memberId: newMember.id,
          action: ActivityAction.INVITATION_ACCEPTED,
          entityType: EntityType.INVITATION,
          entityId: invitation.id,
          metadata: { role: invitation.role },
        });
      }

      return { orgId: invitation.organizationId };
    }),
});
