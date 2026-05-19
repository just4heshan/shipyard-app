"use client";

import { DataTable } from "@shipyard/ui/components/data-table";
import { Input } from "@shipyard/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shipyard/ui/components/select";
import { Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader } from "@/src/components/loader";
import { trpc } from "@/src/providers/trpc-react-provider";
import { ActivityLogDetail } from "./activity-log-detail";
import { activityLogColumns } from "./columns";
import type { ActivityLogItem } from "./types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ActivityLogTableProps {
  orgId: string;
  initialItems: ActivityLogItem[];
  initialCursor: string | null;
  pageSize: number;
}

// ─── Entity filter options ────────────────────────────────────────────────────

const ENTITY_OPTIONS = [
  { value: "ALL", label: "All activity" },
  { value: "MEMBER", label: "Members" },
  { value: "INVITATION", label: "Invitations" },
  { value: "PROJECT", label: "Projects" },
  { value: "TASK", label: "Tasks" },
  { value: "COMMENT", label: "Comments" },
] as const;

// ─── Component ───────────────────────────────────────────────────────────────

export function ActivityLogTable({
  orgId,
  initialItems,
  initialCursor,
  pageSize,
}: ActivityLogTableProps) {
  // ── Items + pagination ──────────────────────────────────────────────────────
  const [allItems, setAllItems] = useState(initialItems);
  const [nextCursor, setNextCursor] = useState<string | null>(initialCursor);

  // ── Fetch control ───────────────────────────────────────────────────────────
  // activeCursor: the cursor to use for the next fetch (undefined = first page)
  // shouldFetch: gate that prevents the query from running automatically
  const [activeCursor, setActiveCursor] = useState<string | undefined>(
    undefined
  );
  const [shouldFetch, setShouldFetch] = useState(false);

  // ── Filters ─────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [entityType, setEntityType] = useState("ALL");

  // ── UI state ────────────────────────────────────────────────────────────────
  const [selectedLog, setSelectedLog] = useState<ActivityLogItem | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState({ x: 0, y: 0, visible: false });

  // ── Debounce search ─────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Reset + re-fetch when filters change ────────────────────────────────────
  // Skip on first render — initial items come from the server already.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setAllItems([]);
    setNextCursor(null);
    setActiveCursor(undefined);
    setShouldFetch(true);
  }, []);

  // ── tRPC query ──────────────────────────────────────────────────────────────
  const { data, isFetching, isError } = trpc.activityLog.list.useQuery(
    {
      orgId,
      cursor: activeCursor,
      limit: pageSize,
      search: debouncedSearch || undefined,
      entityType: entityType === "ALL" ? undefined : entityType,
    },
    { enabled: shouldFetch }
  );

  // ── Append loaded page ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!data) return;
    setAllItems((prev) => [
      ...prev,
      ...data.items.map((item) => ({
        ...item,
        metadata: item.metadata ?? {},
      })),
    ]);
    setNextCursor(data.nextCursor);
    setShouldFetch(false);
  }, [data]);

  // ── Infinite scroll sentinel ────────────────────────────────────────────────
  // rootMargin: "300px" fires ~300px before the sentinel enters the viewport,
  // so the next page loads before the user reaches the end of the list.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          entry?.isIntersecting &&
          nextCursor &&
          !isFetching &&
          !shouldFetch
        ) {
          setActiveCursor(nextCursor);
          setShouldFetch(true);
        }
      },
      { rootMargin: "300px", threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [nextCursor, isFetching, shouldFetch]);

  // ── Cursor-following tooltip handlers ───────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setTip({ x: e.clientX, y: e.clientY, visible: true });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTip((prev) => ({ ...prev, visible: false }));
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────
  const toolbar = (
    <>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search by member…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 w-56"
        />
      </div>
      <Select value={entityType} onValueChange={setEntityType}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ENTITY_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );

  const emptyState = isFetching ? (
    <Loader message="Loading…" size={4} />
  ) : (
    <span>
      {search || entityType !== "ALL"
        ? "No matching activity."
        : "No activity yet. Actions like inviting members or changing roles will appear here."}
    </span>
  );

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

      <div onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
        <DataTable
          columns={activityLogColumns}
          data={allItems}
          toolbar={toolbar}
          emptyState={emptyState}
          onRowClick={setSelectedLog}
        />
      </div>

      {/* Sentinel — IntersectionObserver fires 300px before this enters view */}
      <div ref={sentinelRef} className="flex justify-center py-1">
        {isFetching && allItems.length > 0 && (
          <Loader message="Loading…" size={4} />
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
