import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { db } from "@shipyard/db";
import { CreateOrgDialog } from "./_components/create-org-dialog";
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Organizations</h1>
        <CreateOrgDialog />
      </div>

      {memberships.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
          <p className="text-lg font-medium">No organizations yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first organization to start managing projects.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {memberships.map(({ organization, role }) => (
           <OrganizationCard key={organization.id} organization={organization} role={role} />
          ))}
        </div>
      )}
    </div>
  );
}
