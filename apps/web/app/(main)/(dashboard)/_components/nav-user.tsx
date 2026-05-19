"use client";

import type { SubscriptionTier } from "@shipyard/db/enum";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@shipyard/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@shipyard/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@shipyard/ui/components/sidebar";
import { Skeleton } from "@shipyard/ui/components/skeleton";
import {
  BadgeCheck,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Monitor,
  Moon,
  Sparkles,
  Sun,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import * as React from "react";
import { userInitials } from "@/lib/userInitials";
import { useOrgStore } from "@/src/stores/org-store";

interface Org {
  id: string;
  name: string;
  slug: string;
  subscriptionTier: SubscriptionTier;
}

interface NavUserProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  orgs: Org[];
}

// ─── Theme cycling ────────────────────────────────────────────────────────────

const themeOrder = ["system", "light", "dark"] as const;
type Theme = (typeof themeOrder)[number];
const themeIcon: Record<Theme, React.ElementType> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};
const themeLabel: Record<Theme, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function NavUser({ user, orgs }: NavUserProps) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const initials = userInitials(user.name, user.email);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  // Read active org from the persisted store — same source as OrgSwitcher.
  // Safe to read after mount: localStorage has been synced to the store by then.
  const { activeOrgSlug } = useOrgStore();
  const activeOrg = orgs.find((o) => o.slug === activeOrgSlug) ?? orgs[0];
  const isFree = activeOrg?.subscriptionTier === "FREE";

  if (!mounted) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Skeleton className="size-8 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2.5 w-32" />
            </div>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const currentTheme = (
    themeOrder.includes(theme as Theme) ? theme : "system"
  ) as Theme;
  const ThemeIcon = themeIcon[currentTheme];

  function cycleTheme() {
    const idx = themeOrder.indexOf(currentTheme);
    setTheme(themeOrder[(idx + 1) % themeOrder.length]!);
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-full">
                <AvatarImage src={user.image ?? ""} alt={user.name ?? ""} />
                <AvatarFallback className="rounded-full">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            {/* User identity */}
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-full">
                  <AvatarImage src={user.image ?? ""} alt={user.name ?? ""} />
                  <AvatarFallback className="rounded-full">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            {/* Upgrade to Pro — only shown on the FREE plan */}
            {isFree && activeOrg && (
              <>
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onSelect={() =>
                      router.push(`/${activeOrg.slug}/org-settings/billing`)
                    }
                  >
                    <Sparkles />
                    Upgrade to Pro
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </>
            )}

            {/* Account & billing */}
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={() => router.push("/settings")}>
                <BadgeCheck />
                Account
              </DropdownMenuItem>
              {activeOrg && (
                <DropdownMenuItem
                  onSelect={() =>
                    router.push(`/${activeOrg.slug}/org-settings/billing`)
                  }
                >
                  <CreditCard />
                  Billing
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  cycleTheme();
                }}
              >
                <ThemeIcon />
                <span className="flex-1">Theme</span>
                <span className="text-xs text-muted-foreground">
                  {themeLabel[currentTheme]}
                </span>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onSelect={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
