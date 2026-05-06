import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { db } from "@shipyard/db";
import { OrganizationCard } from "./_components/organization-card";

export default async function DashboardPage() {
  // Permission check lives here, never in layout.tsx
  const session = await auth();
  if (!session) redirect("/login");

  const memberships = await db.member.findMany({
    where: { userId: session.user.id },
    select: {
      role: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          subscriptionTier: true,
          _count: { select: { members: true, projects: true } },
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  // No orgs yet — send to guided setup instead of an empty state
  if (memberships.length === 0) redirect("/onboarding");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Organizations</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {memberships.map(({ organization, role }) => (
          <OrganizationCard
            key={organization.id}
            organization={organization}
            role={role}
          />
        ))}
      </div>
    </div>
  );
}
