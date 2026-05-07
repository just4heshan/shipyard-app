import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { sendEmail } from "@shipyard/email";
import { router, protectedProcedure } from "../trpc";
import { MEMBER_LIMITS } from "../../config/plans";
import type { PrismaClient } from "@shipyard/db";
import { MemberRole } from "@shipyard/db/enum";

// ─── helpers ────────────────────────────────────────────────────────────────

const INVITE_EXPIRY_DAYS = 7;

/** Assert caller is a member of the org and return their membership. */
async function requireMembership(
  db: PrismaClient,
  userId: string,
  orgId: string,
) {
  const membership = await db.member.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
    select: { role: true },
  });
  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not a member of this organization.",
    });
  }
  return membership;
}

/** Assert caller is OWNER or ADMIN. */
function requireManagerRole(role: MemberRole) {
  if (role !== MemberRole.OWNER && role !== MemberRole.ADMIN) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only owners and admins can perform this action.",
    });
  }
}

// ─── router ─────────────────────────────────────────────────────────────────

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
      if (
        target.userId === ctx.session.user.id &&
        target.role === MemberRole.OWNER
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You cannot remove yourself as the owner.",
        });
      }
      // ADMIN cannot remove other ADMINs or OWNERs
      if (
        caller.role === MemberRole.ADMIN &&
        (target.role === MemberRole.OWNER || target.role === MemberRole.ADMIN)
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admins cannot remove owners or other admins.",
        });
      }

      await ctx.db.member.delete({ where: { id: input.memberId } });
      return { success: true };
    }),

  /** Update a member's role. OWNER only. */
  updateRole: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
        memberId: z.string(),
        role: z.enum(MemberRole),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const caller = await requireMembership(
        ctx.db,
        ctx.session.user.id,
        input.orgId,
      );
      if (caller.role !== MemberRole.OWNER) {
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
      if (target.role === MemberRole.OWNER && input.role !== MemberRole.OWNER) {
        const ownerCount = await ctx.db.member.count({
          where: { organizationId: input.orgId, role: MemberRole.OWNER },
        });
        if (ownerCount <= 1) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Cannot demote the last owner.",
          });
        }
      }

      return ctx.db.member.update({
        where: { id: input.memberId },
        data: { role: input.role },
        select: { id: true, role: true },
      });
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

      await ctx.db.invitation.delete({
        where: { id: input.invitationId, organizationId: input.orgId },
      });
      return { success: true };
    }),

  /** Invite a user by email with a role. Sends the invitation email. */
  invite: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
        email: z.email("Invalid email address"),
        role: z.enum(MemberRole),
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
        caller.role === MemberRole.ADMIN &&
        !(input.role === MemberRole.MEMBER || input.role === MemberRole.VIEWER)
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
        select: { token: true },
      });

      const inviterName =
        ctx.session.user.name ?? ctx.session.user.email ?? "Someone";
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const inviteUrl = `${baseUrl}/invite/${invitation.token}`;

      await sendEmail({
        to: input.email,
        subject: `${inviterName} invited you to join ${org.name} on Shipyard`,
        html: inviteEmailHtml({
          inviterName,
          orgName: org.name,
          role: input.role,
          inviteUrl,
          expiryDays: INVITE_EXPIRY_DAYS,
        }),
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

      return { orgId: invitation.organizationId };
    }),
});

// ─── email template ──────────────────────────────────────────────────────────

function inviteEmailHtml({
  inviterName,
  orgName,
  role,
  inviteUrl,
  expiryDays,
}: {
  inviterName: string;
  orgName: string;
  role: string;
  inviteUrl: string;
  expiryDays: number;
}) {
  const roleLabel = role.charAt(0) + role.slice(1).toLowerCase();
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden">
        <!-- Header -->
        <tr><td style="background:#18181b;padding:24px 32px">
          <span style="color:#fafafa;font-size:18px;font-weight:600;letter-spacing:-0.3px">Shipyard</span>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px">
          <p style="margin:0 0 16px;font-size:15px;color:#3f3f46">
            <strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on Shipyard as a <strong>${roleLabel}</strong>.
          </p>
          <p style="margin:0 0 24px;font-size:14px;color:#71717a">
            Click the button below to accept. This invitation expires in ${expiryDays} days.
          </p>
          <a href="${inviteUrl}" style="display:inline-block;background:#18181b;color:#fafafa;font-size:14px;font-weight:500;padding:10px 20px;border-radius:8px;text-decoration:none">
            Accept invitation
          </a>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:16px 32px;border-top:1px solid #f4f4f5">
          <p style="margin:0;font-size:12px;color:#a1a1aa">
            If you weren't expecting this invitation, you can ignore this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
