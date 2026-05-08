import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { db } from "@shipyard/db";
import { MemberRole } from "@shipyard/db/enum";
import { Separator } from "@shipyard/ui/components/separator";
import { requireOrgMembership } from "@/server/requireOrgMembership";
import { ActivityLogTable } from "./_components/activity-log-table";

export const metadata: Metadata = { title: "Activity" };

const PAGE_SIZE = 50;

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  const { membership } = await requireOrgMembership(orgId);
  const { role, organization } = membership;
  if (role !== MemberRole.OWNER && role !== MemberRole.ADMIN) {
    redirect(`/org/${orgId}/members`);
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
    <div className="space-y-6 max-w-4xl">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Dashboard
      </Link>

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
