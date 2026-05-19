import { db } from "@shipyard/db";
import { Separator } from "@shipyard/ui/components/separator";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireOrgMembership } from "@/server/requireOrgMembership";
import { BreadcrumbSetter } from "@/src/components/breadcrumb-setter";
import { ActivityLogTable } from "./_components/activity-log-table";

export const metadata: Metadata = { title: "Activity" };

const PAGE_SIZE = 50;

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  const { membership } = await requireOrgMembership(orgSlug);
  const { role, organization } = membership;
  const orgId = organization.id;

  if (role !== "OWNER" && role !== "ADMIN") {
    redirect(`/${orgSlug}/members`);
  }

  // Fetch first page (+1 to detect if there are more)
  const logs = await db.activityLog.findMany({
    where: { organizationId: orgId },
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
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
  });

  const hasMore = logs.length > PAGE_SIZE;
  const items = hasMore ? logs.slice(0, PAGE_SIZE) : logs;
  const initialCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

  return (
    <div className="space-y-6 max-w-6xl">
      <BreadcrumbSetter labels={{ [orgSlug]: organization.name }} />
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
        <p className="text-sm text-muted-foreground">{organization.name}</p>
      </div>

      <Separator />

      <ActivityLogTable
        orgId={orgId}
        initialItems={items.map((log) => ({
          ...log,
          createdAt: log.createdAt.toISOString(),
        }))}
        initialCursor={initialCursor}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
