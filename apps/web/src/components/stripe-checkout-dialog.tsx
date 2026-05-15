"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Loader2, Lock, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@shipyard/ui/components/dialog";
import { Button } from "@shipyard/ui/components/button";
import { Separator } from "@shipyard/ui/components/separator";
import { trpc } from "@/src/providers/trpc-react-provider";

const _key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = _key ? loadStripe(_key) : null;

function getStripeAppearance(isDark: boolean) {
  return {
    theme: "stripe" as const,
    variables: {
      colorPrimary: isDark ? "hsl(0 0% 92%)" : "hsl(240 5.9% 10%)",
      colorBackground: isDark ? "hsl(240 10% 10%)" : "hsl(0 0% 100%)",
      colorText: isDark ? "hsl(0 0% 98%)" : "hsl(240 10% 3.9%)",
      colorDanger: "hsl(0 84.2% 60.2%)",
      borderRadius: "6px",
      spacingUnit: "4px",
    },
    rules: {
      ".Input": {
        border: `1px solid ${isDark ? "hsl(240 5.9% 22%)" : "hsl(240 5.9% 90%)"}`,
        backgroundColor: isDark ? "hsl(240 10% 13%)" : "hsl(0 0% 100%)",
        color: isDark ? "hsl(0 0% 98%)" : "hsl(240 10% 3.9%)",
        boxShadow: "none",
        fontSize: "14px",
      },
      ".Input:focus": {
        border: `1px solid ${isDark ? "hsl(0 0% 92%)" : "hsl(240 5.9% 10%)"}`,
        boxShadow: isDark
          ? "0 0 0 2px hsl(0 0% 92% / 0.15)"
          : "0 0 0 2px hsl(240 5.9% 10% / 0.1)",
      },
      ".Label": {
        fontSize: "13px",
        fontWeight: "500",
        color: isDark ? "hsl(240 5% 60%)" : "hsl(240 3.8% 46.1%)",
        marginBottom: "6px",
      },
    },
  };
}

interface CheckoutFormProps {
  orgId: string;
  orgSlug: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function CheckoutForm({
  orgId,
  orgSlug,
  onSuccess,
  onCancel,
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const returnUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/${orgSlug}/org-settings/billing?upgraded=1`
      : `/${orgSlug}/org-settings/billing?upgraded=1`;

  const activate = trpc.subscription.activateSubscription.useMutation({
    onSuccess,
    onError: (err) => {
      setError(err.message ?? "Failed to activate subscription.");
      setConfirming(false);
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setConfirming(true);
    setError(null);

    const { error: confirmError, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(
        confirmError.message ?? "Payment setup failed. Please try again.",
      );
      setConfirming(false);
      return;
    }

    if (!setupIntent?.id) {
      setError("Setup did not complete. Please try again.");
      setConfirming(false);
      return;
    }

    // Card saved — now create the subscription with that payment method
    activate.mutate({ orgId, setupIntentId: setupIntent.id });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement
        options={{
          layout: "tabs",
          fields: { billingDetails: { email: "auto" } },
        }}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Separator />

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={confirming}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1 gap-1.5"
          disabled={!stripe || !elements || confirming}
        >
          {confirming ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Zap className="size-4 fill-current" />
          )}
          {confirming ? "Processing…" : "Subscribe to Pro"}
        </Button>
      </div>

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="size-3" />
        Secured by Stripe · Cancel anytime
      </p>
    </form>
  );
}

interface StripeCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  orgSlug: string;
  onSuccess?: () => void;
}

export function StripeCheckoutDialog({
  open,
  onOpenChange,
  orgId,
  orgSlug,
  onSuccess,
}: StripeCheckoutDialogProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const createIntent = trpc.subscription.createSetupIntent.useMutation({
    onSuccess: ({ clientSecret: secret }) => setClientSecret(secret),
  });

  // Fire the mutation as soon as the dialog becomes visible.
  // Can't rely on onOpenChange(true) — Dialog only calls it on close events.
  useEffect(() => {
    if (open && !clientSecret && !createIntent.isPending) {
      createIntent.mutate({ orgId });
    }
    if (!open) {
      setClientSecret(null);
      createIntent.reset();
    }
  }, [open]);

  function handleSuccess() {
    setClientSecret(null);
    onOpenChange(false);
    onSuccess?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="size-4 fill-current text-primary" />
            Upgrade to Pro
          </DialogTitle>
          <DialogDescription>
            Enter your payment details to activate your Pro subscription.
          </DialogDescription>
        </DialogHeader>

        {!stripePromise ? (
          <p className="text-sm text-destructive py-2">
            Stripe is not configured.{" "}
            <code className="font-mono text-xs">
              NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
            </code>{" "}
            is missing from your environment.
          </p>
        ) : createIntent.isPending || !clientSecret ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-sm">Loading payment form…</span>
          </div>
        ) : createIntent.error ? (
          <p className="text-sm text-destructive py-2">
            {createIntent.error.message}
          </p>
        ) : (
          <Elements
            stripe={stripePromise}
            options={{ clientSecret, appearance: getStripeAppearance(isDark) }}
          >
            <CheckoutForm
              orgId={orgId}
              orgSlug={orgSlug}
              onSuccess={handleSuccess}
              onCancel={() => onOpenChange(false)}
            />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  );
}
