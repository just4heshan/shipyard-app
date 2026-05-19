"use client";

import { Button } from "@shipyard/ui/components/button";
import { Input } from "@shipyard/ui/components/input";
import { Label } from "@shipyard/ui/components/label";
import Link from "next/link";
import { useActionState } from "react";
import type { RegisterState } from "./actions";
import { register } from "./actions";

const initialState: RegisterState = { status: "idle" };

export function SignupForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, action, isPending] = useActionState(register, initialState);

  const loginHref = callbackUrl
    ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/login";

  if (state.status === "success") {
    return (
      <div className="space-y-3 rounded-md border border-border bg-card p-6 text-center">
        <p className="text-base font-semibold">Check your inbox</p>
        <p className="text-sm text-muted-foreground">
          We sent a verification link to your email address. Click it to
          activate your account, then{" "}
          <Link href={loginHref} className="underline underline-offset-4">
            sign in
          </Link>
          .
        </p>
        <p className="text-xs text-muted-foreground">
          The link expires in 24 hours.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {callbackUrl && (
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
      )}
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          placeholder="Ada Lovelace"
          autoComplete="name"
          required
          minLength={2}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="ada@example.com"
          autoComplete="email"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Min. 8 characters"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>

      {state.status === "error" && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.message}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  );
}
