"use client";

import type { Prisma } from "@shipyard/db";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@shipyard/ui/components/card";
import { Badge } from "@shipyard/ui/components/badge";
import { Users, FolderKanban, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@shipyard/ui/components/button";
import { trpc } from "@/src/providers/trpc-react-provider";

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

  const deleteOrg = trpc.organization.delete.useMutation({
    onSuccess: () => router.refresh(),
  });

  function handleDelete(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    deleteOrg.mutate({ orgId: organization.id });
  }

  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle>{organization.name}</CardTitle>
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
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
              onClick={handleDelete}
            >
              <Trash className="size-3.5 text-destructive" />
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
