import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@shipyard/ui/components/sidebar";
import { TooltipProvider } from "@shipyard/ui/components/tooltip";
import { AppSidebar } from "./_components/app-sidebar";

// Auth is read here for display only — redirects live in page.tsx per convention
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <SidebarProvider className="h-svh overflow-hidden">
        <AppSidebar />
        <SidebarInset className="overflow-y-auto">
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
            <SidebarTrigger className="-ml-1" />
          </header>
          <main
            className="relative flex-1 p-6"
            style={{
              background:
                "linear-gradient(to top, oklch(50.8% 0.118 165.612 / 0.04) 0%, transparent 60%)",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                backgroundImage:
                  "linear-gradient(rgba(0, 150, 137,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 150, 137,0.02) 1px, transparent 1px)",
                backgroundSize: "5px 5px",
              }}
            />
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
