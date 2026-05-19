"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@shipyard/ui/components/avatar";
import { Button } from "@shipyard/ui/components/button";
import { Textarea } from "@shipyard/ui/components/textarea";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { userInitials } from "@/lib/userInitials";
import { ConfirmDialog } from "@/src/components/confirm-dialog";
import { trpc } from "@/src/providers/trpc-react-provider";

dayjs.extend(relativeTime);

interface Member {
  id: string;
  user: { id: string; name: string | null; image: string | null };
}

interface TaskCommentsProps {
  taskId: string;
  orgId: string;
  callerRole: string;
  currentMemberId: string;
  members: Member[];
  isArchived?: boolean;
}

/**
 * Split comment text into plain spans and highlighted @mention spans.
 *
 * Token format stored in DB: @[Display Name|memberId]
 * - memberId is the source of truth — always looked up against the live
 *   members prop so renames are reflected automatically.
 * - Display Name is a snapshot fallback shown when a member has left the org.
 */
function renderMentions(text: string, members: Member[]) {
  // Split on @[...] tokens; capture group keeps the token in the array
  const parts = text.split(/(@\[[^\]]+\])/g);
  return parts.map((part, i) => {
    const tokenMatch = part.match(/^@\[([^|]+)\|([^\]]+)\]$/);
    if (tokenMatch) {
      const storedName = tokenMatch[1]; // snapshot — fallback only
      const memberId = tokenMatch[2]; // source of truth
      // Prefer live name so renames are always reflected
      const liveMember = members.find((m) => m.id === memberId);
      const displayName = liveMember?.user.name ?? storedName;
      return (
        <span key={i} className="font-semibold text-cyan-800">
          @{displayName}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function TaskComments({
  taskId,
  orgId,
  callerRole,
  currentMemberId,
  members,
  isArchived = false,
}: TaskCommentsProps) {
  const canManage = callerRole === "OWNER" || callerRole === "ADMIN";
  const [content, setContent] = useState("");
  const [confirmCommentId, setConfirmCommentId] = useState<string | null>(null);

  // Mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionListRef = useRef<HTMLDivElement>(null);
  // Maps display name → memberId for every mention inserted this session.
  // Used to encode @Display Name → @[Display Name|id] just before submit.
  const mentionMapRef = useRef(new Map<string, string>());
  const router = useRouter();

  const { data: comments, refetch } = trpc.comment.list.useQuery({
    taskId,
    orgId,
  });

  const create = trpc.comment.create.useMutation({
    onSuccess: () => {
      setContent("");
      mentionMapRef.current.clear();
      void refetch();
    },
  });

  const remove = trpc.comment.delete.useMutation({
    onSuccess: () => {
      void refetch();
      router.refresh();
    },
  });

  // Members whose first name OR normalized full name starts with the typed query
  const filteredMembers =
    mentionQuery !== null
      ? members.filter((m) => {
          const name = m.user.name ?? "";
          const firstName = name.split(" ")[0]?.toLowerCase() ?? "";
          const lastName = name.split(" ")[1]?.toLowerCase() ?? "";
          const normalized = name.toLowerCase().replace(/\s+/g, "");
          const q = mentionQuery.toLowerCase();
          return (
            firstName.startsWith(q) ||
            lastName.startsWith(q) ||
            normalized.startsWith(q)
          );
        })
      : [];

  // Keep the highlighted row visible when navigating with arrow keys
  useEffect(() => {
    if (selectedIndex >= 0 && mentionListRef.current) {
      const item = mentionListRef.current.children[selectedIndex] as
        | HTMLElement
        | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setContent(val);

    const cursor = e.target.selectionStart ?? val.length;
    const textBeforeCursor = val.slice(0, cursor);
    // Active mention = @ followed by word-chars with no gap up to the cursor
    const atMatch = textBeforeCursor.match(/@(\w*)$/);

    if (atMatch) {
      setMentionQuery(atMatch[1] ?? "");
      setMentionStart(cursor - atMatch[0].length);
      setSelectedIndex(0); // always start at first match on each keystroke
    } else {
      setMentionQuery(null);
      setMentionStart(-1);
      setSelectedIndex(0);
    }
  }

  function insertMention(member: Member) {
    const displayName = member.user.name ?? "Unknown";
    const before = content.slice(0, mentionStart);
    const after = content.slice(mentionStart + 1 + (mentionQuery?.length ?? 0));
    // Textarea shows only the readable name; the ID mapping is kept separately
    setContent(`${before}@${displayName} ${after}`);
    mentionMapRef.current.set(displayName, member.id);
    setMentionQuery(null);
    setMentionStart(-1);
    setSelectedIndex(0);
    // Restore focus after React re-render
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // When no dropdown is visible, only intercept ⌘↵ / Ctrl↵ for submit
    if (filteredMembers.length === 0) {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredMembers.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
      case "Tab": {
        e.preventDefault();
        const target = filteredMembers[selectedIndex] ?? filteredMembers[0];
        if (target) insertMention(target);
        break;
      }
      case "Escape":
        e.preventDefault();
        setMentionQuery(null);
        setMentionStart(-1);
        break;
    }
  }

  function handleSubmit() {
    const trimmed = content.trim();
    if (!trimmed) return;
    // Encode any inserted mentions from display format → storage format
    // e.g. "@Lisa Gibson" → "@[Lisa Gibson|cm_id]" using the mentionMap
    // Longest names replaced first to prevent partial-name collisions
    let encoded = trimmed;
    const sorted = [...mentionMapRef.current.entries()].sort(
      (a, b) => b[0].length - a[0].length
    );
    for (const [name, id] of sorted) {
      encoded = encoded.split(`@${name}`).join(`@[${name}|${id}]`);
    }
    create.mutate({ taskId, orgId, content: encoded });
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
                <p className="text-sm text-muted-foreground whitespace-pre-wrap wrap-break-words">
                  {renderMentions(comment.content, members)}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      )}

      {/* New comment input — hidden for VIEWERs and on archived projects */}
      {callerRole !== "VIEWER" && !isArchived && (
        <div className="space-y-2">
          <div className="relative">
            {/* Mention dropdown — floats above the textarea */}
            {filteredMembers.length > 0 && (
              <div
                ref={mentionListRef}
                className="absolute bottom-full mb-1 left-0 right-0 z-50 rounded-md border bg-popover shadow-md max-h-40 overflow-y-auto"
              >
                {filteredMembers.map((m, idx) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                      idx === selectedIndex
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault(); // keep textarea focused during click
                      insertMention(m);
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <Avatar className="size-5 shrink-0">
                      <AvatarImage
                        src={m.user.image ?? ""}
                        alt={m.user.name ?? ""}
                      />
                      <AvatarFallback className="text-[10px]">
                        {userInitials(m.user.name, null)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{m.user.name ?? "Unknown"}</span>
                  </button>
                ))}
              </div>
            )}

            <Textarea
              ref={textareaRef}
              placeholder="Write a comment… type @ to mention"
              value={content}
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              rows={2}
              className="resize-none"
              maxLength={5000}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              ⌘↵ to submit · @ to mention
            </span>
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
