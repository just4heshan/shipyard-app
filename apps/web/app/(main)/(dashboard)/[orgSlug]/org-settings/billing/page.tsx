import { MEMBER_LIMITS, PROJECT_LIMITS } from "@shipyard/api/config/plans";
import { db } from "@shipyard/db";
import type { Metadata } from "next";
import { requireOrgMembership } from "@/server/requireOrgMembership";
import { fetchPriceDetails } from "@/server/stripe";
import { BreadcrumbSetter } from "@/src/components/breadcrumb-setter";
import { BillingCard } from "./_components/billing-card";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const { membership } = await requireOrgMembership(orgSlug);
  const { organization, role } = membership;
  const orgId = organization.id;
  const isOwner = role === "OWNER";

  const [subscription, projectCount, memberCount] = await Promise.all([
    db.subscription.findUnique({
      where: { organizationId: orgId },
      select: {
        status: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        stripePriceId: true,
      },
    }),
    db.project.count({
      where: { organizationId: orgId, status: { not: "ARCHIVED" } },
    }),
    db.member.count({ where: { organizationId: orgId } }),
  ]);

  const priceDetails = subscription?.stripePriceId
    ? await fetchPriceDetails(subscription.stripePriceId)
    : null;

  const tier = organization.subscriptionTier;
  const projectLimit = PROJECT_LIMITS[tier];
  const memberLimit = MEMBER_LIMITS[tier];

  return (
    <>
      <BreadcrumbSetter labels={{ [orgSlug]: organization.name }} />
      <BillingCard
        orgId={orgId}
        orgSlug={orgSlug}
        orgName={organization.name}
        tier={tier}
        isOwner={isOwner}
        subscription={
          subscription
            ? {
                status: subscription.status,
                currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
                cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
              }
            : null
        }
        priceDetails={priceDetails}
        usage={{
          projects: { used: projectCount, limit: projectLimit },
          members: { used: memberCount, limit: memberLimit },
        }}
      />
    </>
  );
}
