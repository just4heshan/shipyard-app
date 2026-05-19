"use client";

import { Badge } from "@shipyard/ui/components/badge";
import { Button } from "@shipyard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@shipyard/ui/components/dialog";
import { Separator } from "@shipyard/ui/components/separator";
import { Building2, Check, Mail, Zap } from "lucide-react";
import { useState } from "react";
import { formatPrice } from "@/lib/formatPrice";
import { trpc } from "@/src/providers/trpc-react-provider";
import { StripeCheckoutDialog } from "./stripe-checkout-dialog";

export type PlanLimitType = "projects" | "members" | "orgs";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  orgSlug: string;
  limitHit: PlanLimitType;
}

const LIMIT_CONTEXT: Record<
  PlanLimitType,
  { title: string; description: string }
> = {
  projects: {
    title: "Project limit reached",
    description:
      "Your free plan allows 1 active project. Upgrade to Pro to create unlimited projects.",
  },
  members: {
    title: "Member limit reached",
    description:
      "Your free plan allows up to 5 members. Upgrade to Pro to invite up to 25 members.",
  },
  orgs: {
    title: "Organization limit reached",
    description:
      "Your free plan allows 1 owned organization. Upgrade to Pro to own up to 10 organizations.",
  },
};

const FREE_FEATURES = [
  "1 active project",
  "Up to 5 members",
  "1 organization",
  "Kanban board",
  "Task comments",
  "Activity log",
];

const PRO_FEATURES = [
  "Unlimited projects",
  "Up to 25 members",
  "Up to 10 organizations",
  "Everything in Free",
  "Priority support",
  "Advanced analytics",
];

const ENTERPRISE_FEATURES = [
  "Unlimited everything",
  "Unlimited members",
  "Unlimited organizations",
  "Everything in Pro",
  "Dedicated support",
  "Custom integrations",
  "SLA guarantee",
  "On-premise option",
];

export function UpgradeDialog({
  open,
  onOpenChange,
  orgId,
  orgSlug,
  limitHit,
}: UpgradeDialogProps) {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const context = LIMIT_CONTEXT[limitHit];

  const { data: proPlan } = trpc.subscription.getProPlanDetails.useQuery(
    { orgId },
    { enabled: open }
  );

  const proPrice = proPlan
    ? formatPrice(proPlan.amount, proPlan.currency, proPlan.interval)
    : null;

  function handleProClick() {
    onOpenChange(false);
    setCheckoutOpen(true);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden gap-0">
          {/* Header */}
          <div className="bg-linear-to-br from-zinc-900 to-zinc-800 px-6 py-5">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="size-4 text-yellow-400 fill-yellow-400" />
              <span className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">
                Choose a plan
              </span>
            </div>
            <DialogTitle className="text-xl font-bold text-white">
              {context?.title ?? "Upgrade your plan"}
            </DialogTitle>
            <DialogDescription className="text-zinc-400 mt-1 text-sm">
              {context?.description ?? "Choose the plan that fits your team."}
            </DialogDescription>
          </div>

          <div className="p-6 space-y-5">
            {/* Plan comparison — 3 columns */}
            <div className="grid grid-cols-3 gap-3">
              {/* Free */}
              <div className="rounded-lg border border-border bg-muted/30 p-4 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold">Free</span>
                  <Badge variant="secondary" className="text-xs">
                    Current
                  </Badge>
                </div>
                <p className="text-2xl font-bold mb-3">
                  $0
                  <span className="text-sm font-normal text-muted-foreground">
                    /mo
                  </span>
                </p>
                <ul className="space-y-1.5 flex-1">
                  {FREE_FEATURES.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-1.5 text-xs text-muted-foreground"
                    >
                      <Check className="size-3 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full"
                  disabled
                >
                  Current plan
                </Button>
              </div>

              {/* Pro */}
              <div className="rounded-lg border-2 border-primary bg-primary/5 p-4 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold">Pro</span>
                  <Badge className="text-xs">
                    <Zap className="size-2.5 mr-1 fill-current" />
                    Popular
                  </Badge>
                </div>
                <p className="text-2xl font-bold mb-3">
                  {proPrice ? (
                    <>
                      {proPrice.formatted}
                      <span className="text-sm font-normal text-muted-foreground">
                        /{proPrice.interval}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground text-base">—</span>
                  )}
                </p>
                <ul className="space-y-1.5 flex-1">
                  {PRO_FEATURES.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-1.5 text-xs text-foreground"
                    >
                      <Check className="size-3 mt-0.5 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  className="mt-4 w-full gap-1.5"
                  onClick={handleProClick}
                >
                  <Zap className="size-3.5 fill-current" />
                  Upgrade to Pro
                </Button>
              </div>

              {/* Enterprise */}
              <div className="rounded-lg border border-border bg-muted/10 p-4 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold">Enterprise</span>
                  <Badge variant="outline" className="text-xs">
                    Custom
                  </Badge>
                </div>
                <p className="text-2xl font-bold mb-3">
                  <span className="text-base font-semibold">Custom</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    pricing
                  </span>
                </p>
                <ul className="space-y-1.5 flex-1">
                  {ENTERPRISE_FEATURES.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-1.5 text-xs text-muted-foreground"
                    >
                      <Building2 className="size-3 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full gap-1.5"
                  asChild
                >
                  <a href="mailto:sales@shipyard.dev">
                    <Mail className="size-3.5" />
                    Contact sales
                  </a>
                </Button>
              </div>
            </div>

            <Separator />

            <p className="text-xs text-center text-muted-foreground">
              Secure payment via Stripe · Cancel anytime · No setup fees
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <StripeCheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        orgId={orgId}
        orgSlug={orgSlug}
        onSuccess={() => setCheckoutOpen(false)}
      />
    </>
  );
}
