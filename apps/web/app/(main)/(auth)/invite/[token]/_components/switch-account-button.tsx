"use client";

import { Button } from "@shipyard/ui/components/button";
import { signOut } from "next-auth/react";

export function SwitchAccountButton({ token }: { token: string }) {
  return (
    <Button
      variant="outline"
      onClick={() =>
        signOut({ callbackUrl: `/login?callbackUrl=/invite/${token}` })
      }
    >
      Sign in with a different account
    </Button>
  );
}
