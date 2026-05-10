import { SocketProvider } from "@/src/providers/socket-provider";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SocketProvider>{children}</SocketProvider>;
}
