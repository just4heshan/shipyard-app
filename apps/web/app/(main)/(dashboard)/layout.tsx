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
          <main className="flex-1 p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
