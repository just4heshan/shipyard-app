import { createServer } from "node:http";
import { logger } from "@shipyard/logger";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "@shipyard/types/socket";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";
import { registerPresenceHandlers } from "./handlers/presence.js";
import { registerTaskHandlers } from "./handlers/tasks.js";
import type { PresenceMap } from "./lib/presence.js";
import { authMiddleware } from "./middleware/auth.js";

const PORT = Number(process.env.SOCKET_PORT ?? 4000);
const WEB_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// ─── HTTP layer ───────────────────────────────────────────────────────────────

const app = express();
app.use(cors({ origin: WEB_URL }));
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "shipyard-socket" });
});

const httpServer = createServer(app);

// ─── Socket.io ────────────────────────────────────────────────────────────────

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>(httpServer, {
  cors: {
    origin: WEB_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// In-memory presence: projectId → userId → { name, image, socketIds }
const presence: PresenceMap = new Map();

io.use(authMiddleware);

io.on("connection", (socket) => {
  logger.info("Socket connected", {
    userId: socket.data.userId,
    socketId: socket.id,
  });

  registerPresenceHandlers(io, socket, presence);
  registerTaskHandlers(socket);

  socket.on("disconnect", (reason) => {
    logger.info("Socket disconnected", {
      userId: socket.data.userId,
      reason,
    });
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  logger.info(`Socket server listening on port ${PORT}`);
});
