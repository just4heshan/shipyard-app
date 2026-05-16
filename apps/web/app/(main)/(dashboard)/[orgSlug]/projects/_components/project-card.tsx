"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Archive, Trash2 } from "lucide-react";
import { trpc } from "@/src/providers/trpc-react-provider";
import { ConfirmDialog } from "@/src/components/confirm-dialog";
import { Badge } from "@shipyard/ui/components/badge";
import { Button } from "@shipyard/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shipyard/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@shipyard/ui/components/dropdown-menu";
import type { MemberRole } from "@shipyard/db/enum";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: "ACTIVE" | "COMPLETED" | "ARCHIVED";
  createdAt: string;
  _count: { tasks: number };
}

interface ProjectCardProps {
  project: Project;
  orgId: string;
  orgSlug: string;
  callerRole: MemberRole;
}

const STATUS_VARIANT: Record<
  Project["status"],
  "default" | "secondary" | "outline"
> = {
  ACTIVE: "default",
  COMPLETED: "secondary",
  ARCHIVED: "outline",
};

export function ProjectCard({
  project,
  orgId,
  orgSlug,
  callerRole,
}: ProjectCardProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const canManage = callerRole === "OWNER" || callerRole === "ADMIN";
  const canDelete = callerRole === "OWNER";

  const archive = trpc.project.archive.useMutation({
    onSuccess: () => router.refresh(),
  });
  const remove = trpc.project.delete.useMutation({
    onSuccess: () => router.refresh(),
  });

  return (
    <>
      <Card className="group relative overflow-hidden hover:shadow-md transition-shadow">
        {/* Subtle indigo grid background */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(99,102,241,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.06) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 40% 50%, rgba(99,102,241,0.25) 0%, transparent 75%)" }} />
        <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight">
            <Link
              href={`/${orgSlug}/projects/${project.id}`}
              className="hover:underline after:absolute after:inset-0"
            >
              {project.name}
            </Link>
          </CardTitle>

          <div className="relative z-10 flex items-center gap-1.5 shrink-0">
            <Badge
              variant={STATUS_VARIANT[project.status]}
              className="text-xs capitalize"
            >
              {project.status.toLowerCase()}
            </Badge>

            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-7 p-0 opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Project actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() =>
                      archive.mutate({ projectId: project.id, orgId })
                    }
                    disabled={archive.isPending}
                  >
                    <Archive className="size-4" />
                    Archive
                  </DropdownMenuItem>
                  {canDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => setConfirmOpen(true)}
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-2">
          {project.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {project.description}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {project._count.tasks}{" "}
            {project._count.tasks === 1 ? "task" : "tasks"}
          </p>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete project"
        description={`"${project.name}" and all its tasks will be permanently deleted.`}
        confirmLabel="Delete project"
        pendingLabel="Deleting…"
        isPending={remove.isPending}
        onConfirm={() => remove.mutate({ projectId: project.id, orgId })}
      />
    </>
  );
}
