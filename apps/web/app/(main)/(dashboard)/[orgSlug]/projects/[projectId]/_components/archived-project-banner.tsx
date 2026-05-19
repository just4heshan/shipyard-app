"use client";

import { Button } from "@shipyard/ui/components/button";
import { ArchiveRestore } from "lucide-react";
import { useRouter } from "next/navigation";
import { trpc } from "@/src/providers/trpc-react-provider";

interface ArchivedProjectBannerProps {
  projectId: string;
  orgId: string;
  orgSlug: string;
  canManage: boolean;
}

export function ArchivedProjectBanner({
  projectId,
  orgId,
  orgSlug,
  canManage,
}: ArchivedProjectBannerProps) {
  const router = useRouter();

  const unarchive = trpc.project.unarchive.useMutation({
    onSuccess: () => router.push(`/${orgSlug}/projects/${projectId}`),
  });

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300 shrink-0">
      <div className="flex items-center gap-2">
        <ArchiveRestore className="size-4 shrink-0" />
        <span>This project is archived. Tasks are read-only.</span>
      </div>
      {canManage && (
        <Button
          size="sm"
          variant="outline"
          className="border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-transparent dark:text-amber-300 dark:hover:bg-amber-950/60 shrink-0"
          disabled={unarchive.isPending}
          onClick={() => unarchive.mutate({ projectId, orgId })}
        >
          {unarchive.isPending ? "Restoring…" : "Unarchive project"}
        </Button>
      )}
    </div>
  );
}
