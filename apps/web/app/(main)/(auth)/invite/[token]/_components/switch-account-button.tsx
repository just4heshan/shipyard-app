"use client";

import { signOut } from "next-auth/react";
import { Button } from "@shipyard/ui/components/button";

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
