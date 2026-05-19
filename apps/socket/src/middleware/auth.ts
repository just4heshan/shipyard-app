import { db } from "@shipyard/db";
import { logger } from "@shipyard/logger";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "@shipyard/types/socket";
import jwt from "jsonwebtoken";
import type { Socket } from "socket.io";

export type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

export async function authMiddleware(
  socket: AppSocket,
  next: (err?: Error) => void
) {
  const token = socket.handshake.auth.token as string | undefined;

  if (!token) {
    return next(new Error("UNAUTHORIZED"));
  }

  const secret = process.env.SOCKET_SECRET;
  if (!secret) {
    logger.error("SOCKET_SECRET is not set — cannot authenticate sockets");
    return next(new Error("Server misconfiguration: SOCKET_SECRET not set"));
  }

  try {
    const payload = jwt.verify(token, secret) as { userId: string };

    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, name: true, image: true },
    });

    if (!user) {
      return next(new Error("UNAUTHORIZED"));
    }

    socket.data.userId = user.id;
    socket.data.userName = user.name;
    socket.data.userImage = user.image;

    next();
  } catch (err) {
    logger.warn("Socket auth failed", { error: String(err) });
    next(new Error("Invalid or expired token"));
  }
}
