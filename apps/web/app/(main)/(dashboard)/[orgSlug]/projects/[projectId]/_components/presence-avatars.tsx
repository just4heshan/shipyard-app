"use client";

import type { PresenceUser } from "@shipyard/types/socket";
import Image from "next/image";
import { userInitials } from "@/lib/userInitials";

interface PresenceAvatarsProps {
  users: PresenceUser[];
}

export function PresenceAvatars({ users }: PresenceAvatarsProps) {
  if (users.length === 0) return null;

  const visible = users.slice(0, 5);
  const overflow = users.length - visible.length;

  return (
    <div className="flex items-center gap-2 shrink-0">
      <span className="text-xs text-muted-foreground">
        {users.length === 1 ? "1 person" : `${users.length} people`} viewing
      </span>
      <div className="flex -space-x-2">
        {visible.map((u) => (
          <div
            key={u.userId}
            title={u.name ?? "Unknown"}
            className="size-7 rounded-full border-2 border-background bg-muted flex items-center justify-center overflow-hidden"
          >
            {u.image ? (
              <Image
                src={u.image}
                alt={u.name ?? ""}
                referrerPolicy="no-referrer"
                className="size-full object-cover"
              />
            ) : (
              <span className="text-[10px] font-medium leading-none">
                {userInitials(u.name, null)}
              </span>
            )}
          </div>
        ))}
        {overflow > 0 && (
          <div className="size-7 rounded-full border-2 border-background bg-muted flex items-center justify-center">
            <span className="text-[10px] font-medium">+{overflow}</span>
          </div>
        )}
      </div>
    </div>
  );
}
