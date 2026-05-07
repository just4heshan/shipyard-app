"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { LayoutDashboard, Settings, Users } from "lucide-react";
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
  const storeOrgId = useOrgStore((s) => s.activeOrgId);

  // URL param wins when navigating directly to an org page;
  // otherwise fall back to the org selected in the switcher.
  const urlOrgId = typeof params.orgId === "string" ? params.orgId : null;
  const orgId = urlOrgId ?? storeOrgId;

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

      {/* Org-scoped nav — only visible when inside /org/[orgId]/... */}
      {orgId && (
        <SidebarGroup>
          <SidebarGroupLabel>Organization</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === `/org/${orgId}/members`}
                  tooltip="Members"
                >
                  <Link href={`/org/${orgId}/members`}>
                    <Users />
                    <span>Members</span>
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
