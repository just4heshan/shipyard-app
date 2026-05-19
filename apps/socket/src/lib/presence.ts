import { db } from "@shipyard/db";
import type {
  ClientToServerEvents,
  PresenceUser,
  ServerToClientEvents,
  SocketData,
} from "@shipyard/types/socket";
import type { Server } from "socket.io";
import type { AppSocket } from "../middleware/auth.js";

export type AppServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

// ─── Presence map ─────────────────────────────────────────────────────────────
// projectId → userId → { name, image, socketIds }
// Set of socketIds handles multi-tab: user leaves presence only when last socket disconnects.

export interface PresenceEntry {
  name: string | null;
  image: string | null;
  socketIds: Set<string>;
}

export type PresenceMap = Map<string, Map<string, PresenceEntry>>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function buildUserList(
  presence: PresenceMap,
  projectId: string
): PresenceUser[] {
  const projectViewers = presence.get(projectId);
  if (!projectViewers) return [];
  return [...projectViewers.entries()].map(([userId, entry]) => ({
    userId,
    name: entry.name,
    image: entry.image,
  }));
}

export async function isMemberOfProject(
  userId: string,
  projectId: string
): Promise<boolean> {
  const member = await db.member.findFirst({
    where: {
      userId,
      organization: { projects: { some: { id: projectId } } },
    },
    select: { id: true },
  });
  return !!member;
}

export function leaveProject(
  io: AppServer,
  socket: AppSocket,
  presence: PresenceMap,
  projectId: string
) {
  const { userId } = socket.data;
  const room = `project:${projectId}`;

  void socket.leave(room);

  const projectPresence = presence.get(projectId);
  if (!projectPresence) return;

  const entry = projectPresence.get(userId);
  if (entry) {
    entry.socketIds.delete(socket.id);
    if (entry.socketIds.size === 0) projectPresence.delete(userId);
  }
  if (projectPresence.size === 0) presence.delete(projectId);

  io.to(room).emit("presence:update", {
    projectId,
    users: buildUserList(presence, projectId),
  });
}
