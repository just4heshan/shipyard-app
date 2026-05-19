"use client";

import { Badge } from "@shipyard/ui/components/badge";
import { Button } from "@shipyard/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shipyard/ui/components/table";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Clock,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Fragment } from "react";
import { trpc } from "@/src/providers/trpc-react-provider";

interface WebhookEventsTableProps {
  orgId: string;
}

function formatEventType(t: string) {
  return t.replace(/^customer\./, "");
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EventStatusBadge({
  processed,
  deadLetter,
  retryQueue,
  retryAttempts,
  maxRetries,
  processingError,
}: {
  processed: boolean;
  deadLetter: boolean;
  retryQueue: boolean;
  retryAttempts: number;
  maxRetries: number;
  processingError: string | null;
}) {
  if (deadLetter) {
    return (
      <Badge variant="destructive" className="gap-1 text-xs">
        <XCircle className="size-3" />
        Dead letter
      </Badge>
    );
  }
  if (processed) {
    return (
      <Badge className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-600">
        <CheckCircle className="size-3" />
        Processed
      </Badge>
    );
  }
  if (retryQueue) {
    return (
      <Badge
        variant="secondary"
        className="gap-1 text-xs text-amber-700 bg-amber-100 hover:bg-amber-100"
      >
        <RefreshCw className="size-3" />
        Retrying ({retryAttempts}/{maxRetries})
      </Badge>
    );
  }
  if (processingError) {
    return (
      <Badge variant="destructive" className="gap-1 text-xs">
        <AlertTriangle className="size-3" />
        Failed
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-xs">
      <Clock className="size-3" />
      Pending
    </Badge>
  );
}

export function WebhookEventsTable({ orgId }: WebhookEventsTableProps) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.subscription.listWebhookEvents.useInfiniteQuery(
      { orgId, limit: 20 },
      { getNextPageParam: (page) => page.nextCursor }
    );

  const events = data?.pages.flatMap((p) => p.items) ?? [];

  if (isLoading) {
    return (
      <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
        Loading webhook events…
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center space-y-1">
        <p className="text-sm font-medium">No webhook events yet</p>
        <p className="text-xs text-muted-foreground">
          Events will appear here once Stripe starts sending webhooks.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Retries</TableHead>
              <TableHead className="text-right">Received</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <Fragment key={event.id}>
                <TableRow>
                  <TableCell>
                    <p className="font-mono font-medium text-sm">
                      {formatEventType(event.eventType)}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {event.stripeEventId}
                    </p>
                  </TableCell>
                  <TableCell>
                    <EventStatusBadge
                      processed={event.processed}
                      deadLetter={event.deadLetter}
                      retryQueue={event.retryQueue}
                      retryAttempts={event.retryAttempts}
                      maxRetries={event.maxRetries}
                      processingError={event.processingError}
                    />
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {event.retryAttempts}/{event.maxRetries}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {formatDate(event.createdAt)}
                  </TableCell>
                </TableRow>
                {event.processingError && (
                  <TableRow className="hover:bg-transparent border-0">
                    <TableCell colSpan={4} className="pt-0 pb-3">
                      <p className="text-xs text-destructive font-mono bg-destructive/5 border border-destructive/20 rounded px-2.5 py-1.5 break-all whitespace-normal">
                        {event.processingError}
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      {hasNextPage && (
        <div className="text-center">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={isFetchingNextPage}
            onClick={() => fetchNextPage()}
          >
            {isFetchingNextPage ? (
              <RefreshCw className="size-3.5 animate-spin" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Showing {events.length} most recent event{events.length !== 1 && "s"}
      </p>
    </div>
  );
}
