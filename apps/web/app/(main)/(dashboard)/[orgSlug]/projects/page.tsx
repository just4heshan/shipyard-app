import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { db } from "@shipyard/db";
import { Separator } from "@shipyard/ui/components/separator";
import { requireOrgMembership } from "@/server/requireOrgMembership";
import { CreateProjectDialog } from "./_components/create-project-dialog";
import { ProjectCard } from "./_components/project-card";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  const { membership } = await requireOrgMembership(orgSlug);
  const { role: callerRole, organization } = membership;
  const orgId = organization.id;
  const canManage = callerRole === "OWNER" || callerRole === "ADMIN";

  const projects = await db.project.findMany({
    where: {
      organizationId: orgId,
      status: { not: "ARCHIVED" },
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
  });

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Dashboard
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">{organization.name}</p>
        </div>
        {canManage && <CreateProjectDialog orgId={orgId} />}
      </div>

      <Separator />

      {/* Project list */}
      {projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No projects yet.{" "}
          {canManage
            ? "Create one to get started."
            : "Ask an admin to create a project."}
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
