import { Separator } from "@shipyard/ui/components/separator";
import { Settings } from "lucide-react";
import { requireOrgMembership } from "@/server/requireOrgMembership";

export default async function OrgSettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const { membership } = await requireOrgMembership(orgSlug);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <Settings className="size-5 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Organization Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            {membership.organization.name}
          </p>
        </div>
      </div>

      <Separator />

      {children}
    </div>
  );
}
