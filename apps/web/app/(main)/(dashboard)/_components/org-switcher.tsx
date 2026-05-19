"use client";

import { ORG_OWNER_LIMITS } from "@shipyard/api/config/plans";
import type { SubscriptionTier } from "@shipyard/db/enum";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@shipyard/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@shipyard/ui/components/sidebar";
import { Skeleton } from "@shipyard/ui/components/skeleton";
import { ChevronsUpDown, Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { UpgradeDialog } from "@/src/components/upgrade-dialog";
import { useOrgStore } from "@/src/stores/org-store";
import { CreateOrgDialog } from "./create-org-dialog";

interface Org {
  id: string;
  name: string;
  slug: string;
  subscriptionTier: SubscriptionTier;
}

function OrgInitials({ name }: { name: string }) {
  return (
    <span className="text-xs font-semibold leading-none">
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

export function OrgSwitcher({
  orgs,
  ownedOrgCount,
}: {
  orgs: Org[];
  ownedOrgCount: number;
}) {
  const { isMobile } = useSidebar();
  const [createOrgOpen, setCreateOrgOpen] = React.useState(false);
  const [upgradeOpen, setUpgradeOpen] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const { activeOrgSlug, setActiveOrgSlug } = useOrgStore();

  // Always start false — server and client initial renders both see false (no hydration mismatch).
  // useEffect runs client-only: resolves immediately if already hydrated (same-session nav),
  // otherwise subscribes to onFinishHydration for cold page loads.
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => {
    if (useOrgStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useOrgStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  function handleOrgChange(orgSlug: string) {
    setActiveOrgSlug(orgSlug);
    if (activeOrgSlug) {
      const match = pathname.match(new RegExp(`^\\/${activeOrgSlug}(\\/.*)?$`));
      if (match) {
        const subPath = match[1] ?? "";
        router.push(`/${orgSlug}${subPath}`);
      }
    }
  }

  React.useEffect(() => {
    // Wait until localStorage has been read — prevents the fallback from
    // firing before persist restores the stored slug and overwriting it.
    if (!hydrated) return;

    const isValid = orgs.some((o) => o.slug === activeOrgSlug);
    if (!activeOrgSlug || !isValid) {
      // No persisted value, or the stored org is no longer accessible
      // (e.g. user was removed from that org) — derive from URL then fall back
      const slugFromPath = pathname.split("/")[1];
      const orgFromPath = orgs.find((o) => o.slug === slugFromPath);
      const fallback = orgFromPath ?? orgs[0];
      if (fallback) setActiveOrgSlug(fallback.slug);
    }
  }, [hydrated, activeOrgSlug, orgs, pathname, setActiveOrgSlug]);

  if (!hydrated) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex items-center gap-2 px-2 py-1.5 min-h-12">
            <Skeleton className="size-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const activeOrg = orgs.find((o) => o.slug === activeOrgSlug) ?? orgs[0];

  if (!activeOrg) return null;

  const atOrgLimit =
    ownedOrgCount >=
    (ORG_OWNER_LIMITS[activeOrg.subscriptionTier] ?? ORG_OWNER_LIMITS.FREE);

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
                  <OrgInitials name={activeOrg.name} />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{activeOrg.name}</span>
                  <span className="truncate text-xs">
                    {activeOrg.subscriptionTier}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Organizations
              </DropdownMenuLabel>

              {orgs.map((org, index) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => handleOrgChange(org.slug)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-full border bg-sidebar-primary text-sidebar-primary-foreground">
                    <OrgInitials name={org.name} />
                  </div>
                  {org.name}
                  <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="gap-2 p-2"
                onSelect={(e) => {
                  e.preventDefault();
                  if (atOrgLimit) {
                    setUpgradeOpen(true);
                  } else {
                    setCreateOrgOpen(true);
                  }
                }}
              >
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <Plus className="size-4" />
                </div>
                <span className="font-medium text-muted-foreground">
                  Add organization
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      {/* Dialogs live outside DropdownMenu to avoid Radix focus-management conflict */}
      <CreateOrgDialog open={createOrgOpen} onOpenChange={setCreateOrgOpen} />
      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        orgId={activeOrg.id}
        orgSlug={activeOrg.slug}
        limitHit="orgs"
      />
    </>
  );
}
