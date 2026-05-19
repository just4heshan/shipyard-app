import { PROJECT_LIMITS } from "@shipyard/api/config/plans";
import { db } from "@shipyard/db";
import { Separator } from "@shipyard/ui/components/separator";
import type { Metadata } from "next";
import Link from "next/link";
import { requireOrgMembership } from "@/server/requireOrgMembership";
import { BreadcrumbSetter } from "@/src/components/breadcrumb-setter";
import { CreateProjectDialog } from "./_components/create-project-dialog";
import { ProjectCard } from "./_components/project-card";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ archived?: string }>;
}) {
  const [{ orgSlug }, { archived }] = await Promise.all([params, searchParams]);
  const showArchived = archived === "true";

  const { membership } = await requireOrgMembership(orgSlug);
  const { role: callerRole, organization } = membership;
  const orgId = organization.id;
  const canManage = callerRole === "OWNER" || callerRole === "ADMIN";

  const [projects, archivedCount] = await Promise.all([
    db.project.findMany({
      where: {
        organizationId: orgId,
        status: showArchived ? "ARCHIVED" : { not: "ARCHIVED" },
      },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.project.count({
      where: { organizationId: orgId, status: "ARCHIVED" },
    }),
  ]);

  const projectLimitReached =
    !showArchived &&
    canManage &&
    projects.length >= PROJECT_LIMITS[organization.subscriptionTier];

  return (
    <div className="space-y-6 max-w-3xl">
      <BreadcrumbSetter labels={{ [orgSlug]: organization.name }} />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">{organization.name}</p>
        </div>
        {canManage && !showArchived && (
          <CreateProjectDialog
            orgId={orgId}
            projectLimitReached={projectLimitReached}
          />
        )}
      </div>

      <Separator />

      {/* Active / Archived toggle */}
      {archivedCount > 0 && (
        <div className="flex items-center gap-1 self-start rounded-lg border bg-muted/40 p-1 text-sm">
          <Link
            href={`/${orgSlug}/projects`}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              !showArchived
                ? "bg-background font-medium shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Active
          </Link>
          <Link
            href={`/${orgSlug}/projects?archived=true`}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              showArchived
                ? "bg-background font-medium shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Archived
            <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-normal">
              {archivedCount}
            </span>
          </Link>
        </div>
      )}

      {/* Project list */}
      {projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {showArchived
            ? "No archived projects."
            : canManage
              ? "No projects yet. Create one to get started."
              : "No projects yet. Ask an admin to create a project."}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={{
                ...project,
                createdAt: project.createdAt.toISOString(),
              }}
              orgId={orgId}
              orgSlug={orgSlug}
              callerRole={callerRole}
            />
          ))}
        </div>
      )}
    </div>
  );
}
