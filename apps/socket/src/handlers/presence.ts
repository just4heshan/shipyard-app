import { logger } from "@shipyard/logger";
import {
  type AppServer,
  buildUserList,
  isMemberOfProject,
  leaveProject,
  type PresenceMap,
} from "../lib/presence.js";
import type { AppSocket } from "../middleware/auth.js";

export function registerPresenceHandlers(
  io: AppServer,
  socket: AppSocket,
  presence: PresenceMap
) {
  const { userId, userName, userImage } = socket.data;

  socket.on("presence:join", async ({ projectId }) => {
    const allowed = await isMemberOfProject(userId, projectId);
    if (!allowed) {
      logger.warn("presence:join denied — not a member", { userId, projectId });
      return;
    }

    const room = `project:${projectId}`;
    await socket.join(room);

    // Add socket to presence map
    if (!presence.has(projectId)) presence.set(projectId, new Map());
    const projectPresence = presence.get(projectId)!;

    if (!projectPresence.has(userId)) {
      projectPresence.set(userId, {
        name: userName,
        image: userImage,
        socketIds: new Set(),
      });
    }
    projectPresence.get(userId)?.socketIds.add(socket.id);

    io.to(room).emit("presence:update", {
      projectId,
      users: buildUserList(presence, projectId),
    });

    logger.info("User joined project room", { userId, projectId });
  });

  socket.on("presence:leave", ({ projectId }) => {
    leaveProject(io, socket, presence, projectId);
  });

  socket.on("disconnect", () => {
    // Clean up every room this socket was tracking
    for (const [projectId, projectPresence] of presence.entries()) {
      if (projectPresence.get(userId)?.socketIds.has(socket.id)) {
        leaveProject(io, socket, presence, projectId);
      }
    }
  });
}
