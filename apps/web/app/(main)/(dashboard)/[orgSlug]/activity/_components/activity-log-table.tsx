"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { trpc } from "@/src/providers/trpc-react-provider";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@shipyard/ui/components/avatar";
import { Badge } from "@shipyard/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shipyard/ui/components/table";
import { Spinner } from "@shipyard/ui/components/spinner";
import { userInitials } from "@/lib/userInitials";
import { ACTION_CONFIG, type ActivityLogItem } from "./types";
import { ActivityLogDetail } from "./activity-log-detail";
import { Loader } from "@/src/components/loader";

dayjs.extend(relativeTime);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDetail(action: string, metadata: unknown): string {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata))
    return "—";
  const m = metadata as Record<string, string>;
  switch (action) {
    case "MEMBER_INVITED":
      return `${m.email} as ${capitalize(m.role)}`;
    case "MEMBER_REMOVED":
      return `Was a ${capitalize(m.role)}`;
    case "MEMBER_ROLE_UPDATED":
      return `${capitalize(m.previousRole)} → ${capitalize(m.newRole)}`;
    case "INVITATION_ACCEPTED":
      return `Joined as ${capitalize(m.role)}`;
    case "INVITATION_CANCELLED":
      return `${m.email}`;
    case "ORG_CREATED":
      return `"${m.name}"`;
    case "PROJECT_CREATED":
    case "PROJECT_UPDATED":
    case "PROJECT_ARCHIVED":
    case "PROJECT_UNARCHIVED":
    case "PROJECT_DELETED":
      return m.name ? `"${m.name}"` : "—";
    case "TASK_CREATED":
    case "TASK_UPDATED":
    case "TASK_ASSIGNED":
    case "TASK_DELETED":
      return m.title ? `"${m.title}"` : "—";
    case "TASK_STATUS_UPDATED":
      return m.title ? `"${m.title}": ${m.from} → ${m.to}` : "—";
    case "COMMENT_CREATED":
    case "COMMENT_DELETED":
      return m.taskId ? `On task ${m.taskId.slice(0, 8)}…` : "—";
    default:
      return "—";
  }
}

function capitalize(s: string | undefined): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface ActivityLogTableProps {
  orgId: string;
  initialItems: ActivityLogItem[];
  initialCursor: string | null;
  pageSize: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ActivityLogTable({
  orgId,
  initialItems,
  initialCursor,
  pageSize,
}: ActivityLogTableProps) {
  const [allItems, setAllItems] = useState(initialItems);
  const [nextCursor, setNextCursor] = useState<string | null>(initialCursor);
  const [fetchCursor, setFetchCursor] = useState<string | undefined>(undefined);
  const [selectedLog, setSelectedLog] = useState<ActivityLogItem | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });

  const handleRowMouseMove = useCallback((e: React.MouseEvent) => {
    setTip({ x: e.clientX, y: e.clientY, visible: true });
  }, []);

  const handleRowMouseLeave = useCallback(() => {
    setTip((prev) => ({ ...prev, visible: false }));
  }, []);

  const {
    data: loadMoreData,
    isFetching,
    isError,
  } = trpc.activityLog.list.useQuery(
    { orgId, cursor: fetchCursor, limit: pageSize },
    { enabled: fetchCursor !== undefined },
  );

  useEffect(() => {
    if (!loadMoreData) return;
    setAllItems((prev) => [
      ...prev,
      ...loadMoreData.items.map((item) => ({
        ...item,
        metadata: item.metadata ?? {},
      })),
    ]);
    setNextCursor(loadMoreData.nextCursor);
    setFetchCursor(undefined);
  }, [loadMoreData]);

  // Infinite scroll — fire when sentinel enters the viewport
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && nextCursor && !isFetching) {
          setFetchCursor(nextCursor);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [nextCursor, isFetching]);

  if (allItems.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No activity yet. Actions like inviting members or changing roles will
        appear here.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cursor-following tooltip */}
      {tip.visible && (
        <div
          className="fixed z-50 pointer-events-none rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md"
          style={{ left: tip.x + 14, top: tip.y + 14 }}
        >
          Click for more details
        </div>
      )}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Who</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="text-right">When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allItems.map((log) => {
              const config = ACTION_CONFIG[log.action];
              const Icon = config?.icon;
              return (
                <TableRow
                  key={log.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                  onMouseMove={handleRowMouseMove}
                  onMouseLeave={handleRowMouseLeave}
                >
                  {/* Who */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7 rounded-md shrink-0">
                        <AvatarImage
                          src={log.member.user.image ?? ""}
                          alt={log.member.user.name ?? ""}
                        />
                        <AvatarFallback className="rounded-md text-xs">
                          {userInitials(
                            log.member.user.name,
                            log.member.user.email,
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium leading-tight">
                          {log.member.user.name ?? log.member.user.email}
                        </p>
                        {log.member.user.name && (
                          <p className="truncate text-xs text-muted-foreground">
                            {log.member.user.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Action */}
                  <TableCell>
                    <Badge variant="secondary" className="gap-1.5 font-normal">
                      {Icon && <Icon className="size-3" />}
                      {config?.label ?? log.action}
                    </Badge>
                  </TableCell>

                  {/* Details */}
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDetail(log.action, log.metadata)}
                  </TableCell>

                  {/* When */}
                  <TableCell className="text-right text-sm text-muted-foreground whitespace-nowrap">
                    {dayjs(log.createdAt).fromNow()}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Sentinel — observed by IntersectionObserver to trigger next page load */}
      <div ref={sentinelRef} className="py-2 flex justify-center">
        {isFetching && (
          <Loader message="Loading..." size={4} />
        )}
        {isError && (
          <p className="text-sm text-destructive">
            Failed to load more entries. Please try again.
          </p>
        )}
      </div>

      <ActivityLogDetail
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
}
