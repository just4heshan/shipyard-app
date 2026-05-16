import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@shipyard/db";
import { requireOrgMembership } from "@/server/requireOrgMembership";
import { KanbanBoard } from "./_components/kanban-board";
import { ArchivedProjectBanner } from "./_components/archived-project-banner";
import { ProjectHeader } from "./_components/project-header";

export const metadata: Metadata = { title: "Board" };

export default async function ProjectBoardPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectId: string }>;
}) {
  const { orgSlug, projectId } = await params;

  const { membership } = await requireOrgMembership(orgSlug);
  const { role: callerRole, organization } = membership;
  const orgId = organization.id;
  const currentMemberId = membership.id;

  const [project, tasks, members] = await Promise.all([
    db.project.findFirst({
      where: { id: projectId, organizationId: orgId },
      select: { id: true, name: true, description: true, status: true },
    }),
    db.task.findMany({
      where: { projectId },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        position: true,
        dueDate: true,
        createdAt: true,
        assignee: {
          select: {
            id: true,
            user: { select: { name: true, image: true } },
          },
        },
      },
      orderBy: { position: "asc" },
    }),
    db.member.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        user: { select: { id: true, name: true, image: true } },
      },
      orderBy: { joinedAt: "asc" },
    }),
  ]);

  if (!project) notFound();

  const isArchived = project.status === "ARCHIVED";
  const canManage = callerRole === "OWNER" || callerRole === "ADMIN";

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Back link + header */}
      <ProjectHeader
        projectId={projectId}
        orgId={orgId}
        orgSlug={orgSlug}
        initialName={project.name}
        initialDescription={project.description ?? null}
        canManage={canManage}
        isArchived={isArchived}
      />

      {isArchived && (
        <ArchivedProjectBanner
          projectId={projectId}
          orgId={orgId}
          orgSlug={orgSlug}
          canManage={canManage}
        />
      )}

      <KanbanBoard
        projectId={projectId}
        orgId={orgId}
        callerRole={callerRole}
        currentMemberId={currentMemberId}
        isArchived={isArchived}
        initialTasks={tasks.map((t) => ({
          ...t,
          dueDate: t.dueDate ? t.dueDate.toISOString() : null,
          createdAt: t.createdAt.toISOString(),
        }))}
        members={members}
      />
    </div>
  );
}
