import { db } from "@shipyard/db";
import { auth } from "@/server/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@shipyard/ui/components/sidebar";
import { NavMain } from "./nav-main";
import { OrgSwitcher } from "./org-switcher";
import { NavUser } from "./nav-user";
import { redirect } from "next/navigation";

export async function AppSidebar() {
  const session = await auth();

  // redirect() throws — TypeScript narrows session to Session after this line
  if (!session) redirect("/login");

  const memberships = await db.member.findMany({
    where: { userId: session.user.id },
    select: {
      role: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          subscriptionTier: true,
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  const orgs = memberships.map((m) => m.organization);
  const ownedOrgCount = memberships.filter((m) => m.role === "OWNER").length;

  return (
    <Sidebar collapsible="icon">
      {/* Header — org switcher */}
      <SidebarHeader>
        <OrgSwitcher orgs={orgs} ownedOrgCount={ownedOrgCount} />
      </SidebarHeader>

      {/* Nav items */}
      <SidebarContent>
        <NavMain memberships={memberships.map((m) => ({ role: m.role, orgSlug: m.organization.slug }))} />
      </SidebarContent>

      {/* Footer — user info + logout */}
      <SidebarFooter>
        <NavUser
          user={{
            name: session.user.name,
            email: session.user.email,
            image: session.user.image,
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
