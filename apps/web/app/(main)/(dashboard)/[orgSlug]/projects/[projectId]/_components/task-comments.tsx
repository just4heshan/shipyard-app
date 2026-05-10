"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { trpc } from "@/src/providers/trpc-react-provider";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@shipyard/ui/components/avatar";
import { Button } from "@shipyard/ui/components/button";
import { Textarea } from "@shipyard/ui/components/textarea";
import { userInitials } from "@/lib/userInitials";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/src/components/confirm-dialog";

dayjs.extend(relativeTime);

interface TaskCommentsProps {
  taskId: string;
  orgId: string;
  callerRole: string;
  currentMemberId: string;
}

export function TaskComments({
  taskId,
  orgId,
  callerRole,
  currentMemberId,
}: TaskCommentsProps) {
  const canManage = callerRole === "OWNER" || callerRole === "ADMIN";
  const [content, setContent] = useState("");
  const [confirmCommentId, setConfirmCommentId] = useState<string | null>(null);
  const router = useRouter();

  const { data: comments, refetch } = trpc.comment.list.useQuery({
    taskId,
    orgId,
  });

  const create = trpc.comment.create.useMutation({
    onSuccess: () => {
      setContent("");
      void refetch();
    },
  });

  const remove = trpc.comment.delete.useMutation({
    onSuccess: () => {
      void refetch();
      router.refresh();
    },
  });

  function handleSubmit() {
    const trimmed = content.trim();
    if (!trimmed) return;
    create.mutate({ taskId, orgId, content: trimmed });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">
        Comments{" "}
        {comments && comments.length > 0 && (
          <span className="text-muted-foreground">({comments.length})</span>
        )}
      </p>

      {/* Comment list */}
      {comments && comments.length > 0 ? (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-2.5 group">
              <Avatar className="size-7 shrink-0 mt-0.5">
                <AvatarImage
                  src={comment.author.user.image ?? ""}
                  alt={comment.author.user.name ?? ""}
                />
                <AvatarFallback className="text-xs">
                  {userInitials(comment.author.user.name, null)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium truncate">
                    {comment.author.user.name ?? "Unknown"}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {dayjs(comment.createdAt).fromNow()}
                  </span>
                  {(comment.author.id === currentMemberId || canManage) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-auto py-0 px-1 text-xs text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setConfirmCommentId(comment.id)}
                      disabled={remove.isPending}
                    >
                      <Trash2 className="size-3" />
                      <span className="">Delete</span>
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      )}

      {/* New comment input — hidden for VIEWERs */}
      {callerRole !== "VIEWER" && (
        <div className="space-y-2">
          <Textarea
            placeholder="Write a comment…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            className="resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
            }}
            maxLength={5000}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">⌘↵ to submit</span>
            <Button
              size="sm"
              disabled={!content.trim() || create.isPending}
              onClick={handleSubmit}
            >
              {create.isPending ? "Posting…" : "Comment"}
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmCommentId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmCommentId(null);
        }}
        onConfirm={() => {
          if (confirmCommentId)
            remove.mutate({ commentId: confirmCommentId, orgId });
          setConfirmCommentId(null);
        }}
        title="Delete comment"
        description="Are you sure you want to delete this comment? This action cannot be undone."
        confirmLabel="Yes, delete"
        isPending={remove.isPending}
      />
    </div>
  );
}
