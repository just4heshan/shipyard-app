"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Activity, ChevronRight, FolderKanban, LayoutDashboard, Settings, Users, CreditCard, Webhook } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@shipyard/ui/components/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@shipyard/ui/components/collapsible";
import { useOrgStore } from "@/src/stores/org-store";

const globalItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function NavMain({
  memberships,
}: {
  memberships: { role: string; orgSlug: string }[];
}) {
  const pathname = usePathname();
  const params = useParams();
  const storeOrgSlug = useOrgStore((s) => s.activeOrgSlug);

  // URL param wins when navigating directly to an org page;
  // otherwise fall back to the org selected in the switcher.
  const urlOrgSlug = typeof params.orgSlug === "string" ? params.orgSlug : null;
  const orgSlug = urlOrgSlug ?? storeOrgSlug;

  const currentRole = memberships.find((m) => m.orgSlug === orgSlug)?.role;
  const isOwner = currentRole === "OWNER";
  const isSettingsActive = !!orgSlug && pathname.startsWith(`/${orgSlug}/org-settings`);

  return (
    <>
      {/* Global nav — always visible */}
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {globalItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.url}
                  tooltip={item.title}
                >
                  <Link href={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Org-scoped nav — only visible when an org is active */}
      {orgSlug && (
        <SidebarGroup>
          <SidebarGroupLabel>Organization</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(`/${orgSlug}/projects`)}
                  tooltip="Projects"
                >
                  <Link href={`/${orgSlug}/projects`}>
                    <FolderKanban />
                    <span>Projects</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === `/${orgSlug}/members`}
                  tooltip="Members"
                >
                  <Link href={`/${orgSlug}/members`}>
                    <Users />
                    <span>Members</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === `/${orgSlug}/activity`}
                  tooltip="Activity"
                >
                  <Link href={`/${orgSlug}/activity`}>
                    <Activity />
                    <span>Activity</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Settings — collapsible with sub-items */}
              <Collapsible
                asChild
                defaultOpen={isSettingsActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={isSettingsActive} tooltip="Settings">
                      <Settings />
                      <span>Organization Settings</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={pathname.startsWith(`/${orgSlug}/org-settings/billing`)}
                        >
                          <Link href={`/${orgSlug}/org-settings/billing`}>
                            <CreditCard />
                            <span>Billing</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      {isOwner && (
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            isActive={pathname.startsWith(`/${orgSlug}/org-settings/webhooks`)}
                          >
                            <Link href={`/${orgSlug}/org-settings/webhooks`}>
                              <Webhook />
                              <span>Webhooks</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}
    </>
  );
}
