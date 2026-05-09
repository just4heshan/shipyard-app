"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { trpc } from "@/src/trpc/react";
import { Button } from "@shipyard/ui/components/button";
import { Input } from "@shipyard/ui/components/input";
import { Label } from "@shipyard/ui/components/label";
import { toSlug } from "@shipyard/api/lib/slug";

export function SetupOrgForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const slug = toSlug(name);

  const createOrg = trpc.organization.create.useMutation({
    onSuccess: () => router.push("/dashboard"),
  });

  function handleSubmit() {
    const trimmed = name.trim();
    if (trimmed.length >= 2) createOrg.mutate({ name: trimmed });
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Left: form ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col justify-center px-8 py-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm space-y-8">
          {/* Brand mark */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="size-4" />
            </div>
            <span className="font-semibold tracking-tight">Shipyard</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Set up your organization
            </h1>
            <p className="text-sm text-muted-foreground">
              Create your first workspace to start managing projects with your
              team.
            </p>
          </div>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="org-name">Organization name</Label>
              <Input
                id="org-name"
                placeholder="Acme Inc"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
                autoFocus
              />
              {slug && (
                <p className="text-xs text-muted-foreground">
                  URL: <span className="font-mono">shipyard.dev/{slug}</span>
                </p>
              )}
            </div>

            {createOrg.error && (
              <p className="text-sm text-destructive">
                {createOrg.error.message}
              </p>
            )}

            <Button
              className="w-full"
              disabled={name.trim().length < 2 || createOrg.isPending}
              onClick={handleSubmit}
            >
              {createOrg.isPending ? "Creating…" : "Continue"}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Right: live preview ─────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-muted/40 p-12">
        <div className="w-full max-w-xs space-y-4">
          {/* Simulated browser chrome */}
          <div className="overflow-hidden rounded-xl border bg-background shadow-md">
            {/* Fake title bar */}
            <div className="flex items-center gap-1.5 border-b bg-muted/60 px-3 py-2">
              <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
              <div className="ml-2 flex-1 rounded bg-background/80 px-2 py-0.5 text-xs text-muted-foreground">
                shipyard.dev/{slug || "your-org"}
              </div>
            </div>

            <div className="space-y-3 p-4">
              {/* Org header */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                  {name ? name.slice(0, 2).toUpperCase() : "??"}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold leading-tight">
                    {name || "Organization name"}
                  </p>
                  <p className="text-xs text-muted-foreground">FREE</p>
                </div>
              </div>

              {/* Placeholder nav items */}
              <div className="space-y-1 pt-1">
                {["Dashboard", "Projects", "Members", "Settings"].map(
                  (item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5"
                    >
                      <div className="h-3 w-3 rounded-sm bg-muted-foreground/30" />
                      <span className="text-xs text-muted-foreground">
                        {item}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Invite your team after setup
          </p>
        </div>
      </div>
    </div>
  );
}
