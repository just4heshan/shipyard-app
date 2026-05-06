import type { Metadata } from "next";
import { Separator } from "@shipyard/ui/components/separator";
import { ThemeSelector } from "./_components/theme-selector";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account preferences.
        </p>
      </div>

      <Separator />

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">Appearance</h2>
          <p className="text-sm text-muted-foreground">
            Choose how Shipyard looks for you.
          </p>
        </div>
        <ThemeSelector />
      </section>
    </div>
  );
}
