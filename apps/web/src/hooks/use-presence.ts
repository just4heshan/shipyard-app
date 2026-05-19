"use client";

import type { PresenceUser } from "@shipyard/types/socket";
import { useEffect, useState } from "react";
import { useSocket } from "@/src/providers/socket-provider";

export function usePresence(projectId: string) {
  const { socket } = useSocket();
  const [users, setUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!socket) return;

    socket.on("presence:update", (data) => {
      if (data.projectId !== projectId) return;
      setUsers(data.users);
    });

    return () => {
      socket.off("presence:update");
    };
  }, [socket, projectId]);

  return users;
}
