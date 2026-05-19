import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@shipyard/types/socket";
import { io, type Socket } from "socket.io-client";

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let _socket: AppSocket | null = null;

/** Create (or recreate) the socket with a fresh auth token. */
export function createSocket(token: string): AppSocket {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }

  _socket = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000", {
    auth: { token },
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  return _socket;
}

export function getSocket(): AppSocket | null {
  return _socket;
}

export function disconnectSocket() {
  _socket?.disconnect();
  _socket = null;
}
