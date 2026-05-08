"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Activity, FolderKanban, LayoutDashboard, Settings, Users } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@shipyard/ui/components/sidebar";
import { useOrgStore } from "@/src/stores/org-store";

const globalItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function NavMain() {
  const pathname = usePathname();
  const params = useParams();
  const storeOrgSlug = useOrgStore((s) => s.activeOrgSlug);

  // URL param wins when navigating directly to an org page;
  // otherwise fall back to the org selected in the switcher.
  const urlOrgSlug = typeof params.orgSlug === "string" ? params.orgSlug : null;
  const orgSlug = urlOrgSlug ?? storeOrgSlug;

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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}
    </>
  );
}
