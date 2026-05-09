"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronsUpDown, Lock, Plus } from "lucide-react";
import type { SubscriptionTier } from "@shipyard/db/enum";
import { ORG_OWNER_LIMITS } from "@shipyard/api/config/plans";
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
  const pathname = usePathname();
  const router = useRouter();

  const { activeOrgSlug, setActiveOrgSlug } = useOrgStore();

  function handleOrgChange(orgSlug: string) {
    setActiveOrgSlug(orgSlug);
    // If currently on a page of the active org, navigate to the same sub-page for the new org.
    // Guard on activeOrgSlug so the regex is never built with an undefined slug.
    if (activeOrgSlug) {
      const match = pathname.match(new RegExp(`^\\/${activeOrgSlug}(\\/.*)?$`));
      if (match) {
        const subPath = match[1] ?? "";
        router.push(`/${orgSlug}${subPath}`);
      }
    }
  }

  // Initialize the store on mount: prefer the org slug already in the URL,
  // fall back to orgs[0] only when the path doesn't match any known org.
  React.useEffect(() => {
    if (!activeOrgSlug) {
      const slugFromPath = pathname.split("/")[1];
      const orgFromPath = orgs.find((o) => o.slug === slugFromPath);
      const fallback = orgFromPath ?? orgs[0];
      if (fallback) setActiveOrgSlug(fallback.slug);
    }
  }, [activeOrgSlug, orgs, pathname, setActiveOrgSlug]);

  // Derive the full org object from the store slug; fall back to first org before store initializes
  const activeOrg = orgs.find((o) => o.slug === activeOrgSlug) ?? orgs[0];

  if (!activeOrg) return null;

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
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
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
                  <div className="flex size-6 items-center justify-center rounded-md border bg-sidebar-primary text-sidebar-primary-foreground">
                    <OrgInitials name={org.name} />
                  </div>
                  {org.name}
                  <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />

              {ownedOrgCount < ORG_OWNER_LIMITS.FREE ? (
                /* e.preventDefault() stops Radix closing the dropdown in a way
                   that steals focus and immediately collapses the dialog */
                <DropdownMenuItem
                  className="gap-2 p-2"
                  onSelect={(e) => {
                    e.preventDefault();
                    setCreateOrgOpen(true);
                  }}
                >
                  <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                    <Plus className="size-4" />
                  </div>
                  <span className="font-medium text-muted-foreground">
                    Add organization
                  </span>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem disabled className="gap-2 p-2">
                  <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                    <Lock className="size-4" />
                  </div>
                  <div className="grid">
                    <span className="font-medium text-muted-foreground">
                      Add organization
                    </span>
                    <span className="text-xs text-muted-foreground/60">
                      Upgrade to Pro
                    </span>
                  </div>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      {/* Dialog lives outside DropdownMenu to avoid Radix focus-management conflict */}
      <CreateOrgDialog open={createOrgOpen} onOpenChange={setCreateOrgOpen} />
    </>
  );
}
