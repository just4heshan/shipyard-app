"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@shipyard/ui/components/avatar";
import { Badge } from "@shipyard/ui/components/badge";
import { Separator } from "@shipyard/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@shipyard/ui/components/sheet";
import { useIsMobile } from "@shipyard/ui/hooks/use-mobile";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { userInitials } from "@/lib/userInitials";
import { ACTION_CONFIG, type ActivityLogItem } from "./types";

dayjs.extend(relativeTime);

interface ActivityLogDetailProps {
  log: ActivityLogItem | null;
  onClose: () => void;
}

export function ActivityLogDetail({ log, onClose }: ActivityLogDetailProps) {
  const isMobile = useIsMobile();

  return (
    <Sheet
      open={log !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {log && (
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={
            isMobile
              ? "overflow-y-auto max-h-[85vh]"
              : "w-full sm:max-w-md overflow-y-auto"
          }
        >
          <SheetHeader className="pb-2">
            <SheetTitle className="flex items-center gap-2">
              {(() => {
                const cfg = ACTION_CONFIG[log.action];
                const Icon = cfg?.icon;
                return (
                  <>
                    {Icon && <Icon className="size-4 shrink-0" />}
                    {cfg?.label ?? log.action}
                  </>
                );
              })()}
            </SheetTitle>
            <p className="text-xs text-muted-foreground">
              {dayjs(log.createdAt).format("D MMM YYYY, HH:mm:ss")}
              <span className="ml-1 text-muted-foreground/60">
                ({dayjs(log.createdAt).fromNow()})
              </span>
            </p>
          </SheetHeader>

          <Separator />

          <div className="flex flex-col gap-5 p-4">
            {/* Actor */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Actor
              </p>
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8 rounded-full shrink-0">
                  <AvatarImage
                    src={log.member.user.image ?? ""}
                    alt={log.member.user.name ?? ""}
                  />
                  <AvatarFallback className="rounded-full text-xs">
                    {userInitials(log.member.user.name, log.member.user.email)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">
                    {log.member.user.name ?? log.member.user.email}
                  </p>
                  {log.member.user.name && (
                    <p className="text-xs text-muted-foreground">
                      {log.member.user.email}
                    </p>
                  )}
                </div>
                <Badge variant="secondary" className="ml-auto capitalize">
                  {log.member.role.toLowerCase()}
                </Badge>
              </div>
            </div>

            {/* Event */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Event
              </p>
              <div className="rounded-md border divide-y text-sm">
                <div className="flex justify-between px-3 py-2">
                  <span className="text-muted-foreground">Action</span>
                  <span className="font-mono text-xs">{log.action}</span>
                </div>
                <div className="flex justify-between px-3 py-2">
                  <span className="text-muted-foreground">Entity type</span>
                  <span className="font-mono text-xs">{log.entityType}</span>
                </div>
                <div className="flex justify-between px-3 py-2">
                  <span className="text-muted-foreground">Entity ID</span>
                  <span className="font-mono text-xs truncate max-w-45">
                    {log.entityId}
                  </span>
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Metadata
              </p>
              <pre className="rounded-md border bg-muted p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
                {log.metadata ? JSON.stringify(log.metadata, null, 2) : "null"}
              </pre>
            </div>
          </div>
        </SheetContent>
      )}
    </Sheet>
  );
}
