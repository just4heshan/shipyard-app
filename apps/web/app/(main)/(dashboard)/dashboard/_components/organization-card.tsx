"use client";

import type { Prisma } from "@shipyard/db";
import { Badge } from "@shipyard/ui/components/badge";
import { Button } from "@shipyard/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@shipyard/ui/components/card";
import { FolderKanban, Trash, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/src/components/confirm-dialog";
import { trpc } from "@/src/providers/trpc-react-provider";
import { useOrgStore } from "@/src/stores/org-store";

// Derived from the Prisma select in dashboard/page.tsx — stays in sync automatically
export type OrganizationCardProps = Prisma.MemberGetPayload<{
  select: {
    role: true;
    organization: {
      select: {
        id: true;
        name: true;
        slug: true;
        subscriptionTier: true;
        _count: { select: { members: true; projects: true } };
      };
    };
  };
}>;

const ROLE_VARIANT: Record<
  OrganizationCardProps["role"],
  "default" | "secondary" | "outline"
> = {
  OWNER: "default",
  ADMIN: "secondary",
  MEMBER: "outline",
  VIEWER: "outline",
};

const TIER_VARIANT: Record<
  OrganizationCardProps["organization"]["subscriptionTier"],
  "default" | "secondary" | "outline"
> = {
  FREE: "outline",
  PRO: "secondary",
  ENTERPRISE: "default",
};

export function OrganizationCard({
  organization,
  role,
}: OrganizationCardProps) {
  const router = useRouter();
  const { setActiveOrgSlug } = useOrgStore();

  const [confirmDeleteOrgOpen, setConfirmDeleteOrgOpen] = useState(false);

  const deleteOrg = trpc.organization.delete.useMutation({
    onSuccess: () => router.refresh(),
  });

  function handleDelete() {
    deleteOrg.mutate({ orgId: organization.id });
  }

  return (
    <Card className="group relative overflow-hidden h-full transition-shadow hover:shadow-md">
      {/* Subtle grid background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(0, 150, 137,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 150, 137,0.06) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 40% 50%, rgba(0, 150, 137,0.15) 0%, transparent 75%)",
        }}
      />

      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle>
            <Link
              href={`/${organization.slug}/projects`}
              onClick={() => setActiveOrgSlug(organization.slug)}
              className="hover:underline after:absolute after:inset-0"
            >
              {organization.name}
            </Link>
          </CardTitle>
          <Badge variant={ROLE_VARIANT[role]}>{role}</Badge>
        </div>
        <CardDescription>/{organization.slug}</CardDescription>
      </CardHeader>

      <CardContent className="flex gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Users className="size-3.5" />
          {organization._count.members} members
        </span>
        <span className="flex items-center gap-1.5">
          <FolderKanban className="size-3.5" />
          {organization._count.projects} projects
        </span>
      </CardContent>

      <CardFooter className="flex items-center justify-between">
        <Badge variant={TIER_VARIANT[organization.subscriptionTier]}>
          {organization.subscriptionTier}
        </Badge>
        <div className="relative z-10 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              setActiveOrgSlug(organization.slug);
              router.push(`/${organization.slug}/members`);
            }}
          >
            <Users className="size-3.5" />
            Members
          </Button>
          {role === "OWNER" && (
            <Button
              variant="outline"
              size="sm"
              disabled={deleteOrg.isPending}
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.preventDefault();
                setConfirmDeleteOrgOpen(true);
              }}
            >
              <Trash className="size-3.5 text-destructive" />
            </Button>
          )}
        </div>
      </CardFooter>

      <ConfirmDialog
        open={confirmDeleteOrgOpen}
        onOpenChange={setConfirmDeleteOrgOpen}
        onConfirm={handleDelete}
        title="Delete organization?"
        description={`Are you sure you want to delete "${organization.name}"? This action cannot be undone.`}
        confirmLabel="Yes, delete"
        pendingLabel="Deleting…"
        isPending={deleteOrg.isPending}
      />
    </Card>
  );
}
