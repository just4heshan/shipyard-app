"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { trpc } from "@/src/providers/trpc-react-provider";
import { createSocket, disconnectSocket, type AppSocket } from "@/lib/socket";

interface SocketContextValue {
  socket: AppSocket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
});

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<AppSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const getToken = trpc.socket.socketToken.useMutation();
  // Prevent double-connection in React strict mode
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const connect = (token: string) => {
      const s = createSocket(token);
      setSocket(s);

      s.on("connect", () => setConnected(true));
      s.on("disconnect", () => setConnected(false));
      s.io.on("reconnect_failed", () => {
        // All reconnect attempts exhausted — token likely expired.
        // Fetch a fresh token and reconnect.
        getToken.mutateAsync().then(({ token: newToken }) => {
          s.auth = { token: newToken };
          s.connect();
        });
      });
    };

    getToken.mutateAsync().then(({ token }) => connect(token));

    return () => {
      disconnectSocket();
      setSocket(null);
      setConnected(false);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}
