import {
  Button,
  Heading,
  Hr,
  render,
  Section,
  Text,
} from "@react-email/components";
import { EmailShell, styles } from "../components/email-shell";

export interface CommentMentionEmailProps {
  mentionedName: string;
  authorName: string;
  authorImage?: string | null;
  commentText: string;
  taskTitle: string;
  projectName: string;
  orgName: string;
  taskUrl: string;
  createdAt: string;
}

const local = {
  greeting: {
    fontSize: "14px",
    color: "#71717a",
    margin: "0 0 4px",
  },
  subHeading: {
    fontSize: "15px",
    color: "#3f3f46",
    margin: "0 0 20px",
    lineHeight: "1.5",
  },
  taskContext: {
    backgroundColor: "#f4f4f5",
    borderRadius: "8px",
    padding: "12px 16px",
    marginBottom: "20px",
    border: "1px solid #e4e4e7",
  },
  taskContextLabel: {
    fontSize: "11px",
    color: "#71717a",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    fontWeight: "600",
    margin: "0 0 4px",
  },
  taskContextTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#09090b",
    margin: "0",
  },
  commentCard: {
    backgroundColor: "#fafafa",
    border: "1px solid #e4e4e7",
    borderRadius: "10px",
    padding: "16px",
    marginBottom: "24px",
    borderLeft: "3px solid #09090b",
  },
  commentHeader: {
    marginBottom: "12px",
  },
  authorAvatar: {
    display: "inline-block",
    width: "32px",
    height: "32px",
    backgroundColor: "#18181b",
    borderRadius: "50%",
    verticalAlign: "middle",
    marginRight: "10px",
    textAlign: "center" as const,
  },
  avatarText: {
    color: "#fafafa",
    fontSize: "11px",
    fontWeight: "700",
    textAlign: "center" as const,
    lineHeight: "32px",
    margin: "0",
    padding: "0",
  },
  authorInfo: {
    display: "inline-block",
    verticalAlign: "middle",
  },
  authorName: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#09090b",
    margin: "0",
  },
  commentTime: {
    fontSize: "12px",
    color: "#71717a",
    margin: "0",
  },
  commentDivider: {
    borderColor: "#e4e4e7",
    margin: "12px 0",
  },
  commentText: {
    fontSize: "15px",
    color: "#3f3f46",
    lineHeight: "1.65",
    margin: "0",
    whiteSpace: "normal" as const,
  },
  hint: {
    fontSize: "13px",
    color: "#71717a",
    lineHeight: "1.5",
    margin: "0",
  },
};

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function CommentMentionEmail({
  mentionedName,
  authorName,
  commentText,
  taskTitle,
  projectName,
  taskUrl,
  createdAt,
}: CommentMentionEmailProps) {
  const firstName = mentionedName.split(" ")[0] ?? mentionedName;
  // Single-pass replace handles both formats:
  //   @[Lisa Gibson|cm_id]  →  [@Lisa Gibson]   (ID-encoded, current format)
  //   @alex                 →  [@alex]           (plain handle, legacy format)
  const highlightedComment = commentText.replace(
    /@\[([^|]+)\|[^\]]+\]|@(\w+)/g,
    (_, idName?: string, simpleName?: string) => `[@${idName ?? simpleName}]`
  );
  const timeAgo = formatTimeAgo(new Date(createdAt));

  return (
    <EmailShell
      preview={`${authorName} mentioned you in a comment on "${taskTitle}"`}
    >
      <Text style={local.greeting}>Hi {firstName},</Text>

      <Heading style={styles.heading}>You were mentioned</Heading>

      <Text style={local.subHeading}>
        <strong>{authorName}</strong> mentioned you in a comment on a task in{" "}
        <strong>{projectName}</strong>.
      </Text>

      <Section style={local.taskContext}>
        <Text style={local.taskContextLabel}>💬 on task</Text>
        <Text style={local.taskContextTitle}>{taskTitle}</Text>
      </Section>

      <Section style={local.commentCard}>
        <Section style={local.commentHeader}>
          <Section style={local.authorAvatar}>
            <Text style={local.avatarText}>
              {authorName.slice(0, 2).toUpperCase()}
            </Text>
          </Section>
          <Section style={local.authorInfo}>
            <Text style={local.authorName}>{authorName}</Text>
            <Text style={local.commentTime}>{timeAgo}</Text>
          </Section>
        </Section>

        <Hr style={local.commentDivider} />

        <Text style={local.commentText}>{highlightedComment}</Text>
      </Section>

      <Section style={styles.ctaSection}>
        <Button href={taskUrl} style={styles.ctaButton}>
          Reply to comment →
        </Button>
      </Section>

      <Text style={local.hint}>
        Open the task to view the full conversation and reply directly.
      </Text>
    </EmailShell>
  );
}

CommentMentionEmail.PreviewProps = {
  mentionedName: "Jordan Lee",
  authorName: "Alex Johnson",
  commentText: "Hey @jordan can you review the acceptance criteria for this?",
  taskTitle: "Implement OAuth flow",
  projectName: "Backend v2",
  orgName: "Acme Corp",
  taskUrl: "https://shipyard.dev/acme/projects/backend-v2/tasks/task-42",
  createdAt: new Date().toISOString(),
} satisfies CommentMentionEmailProps;

export default CommentMentionEmail;

export async function renderCommentMentionEmail(
  props: CommentMentionEmailProps
): Promise<string> {
  return render(<CommentMentionEmail {...props} />);
}
