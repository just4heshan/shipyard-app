import {
  Button,
  Heading,
  Hr,
  Section,
  Text,
  render,
} from "@react-email/components";
import { EmailShell, styles } from "../components/email-shell";

export interface TaskAssignedEmailProps {
  assigneeName: string;
  assignerName: string;
  taskTitle: string;
  taskDescription?: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  projectName: string;
  orgName: string;
  dueDate?: string | null;
  taskUrl: string;
}

const PRIORITY_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: string }
> = {
  LOW: { label: "Low", color: "#16a34a", bg: "#f0fdf4", icon: "↓" },
  MEDIUM: { label: "Medium", color: "#d97706", bg: "#fffbeb", icon: "→" },
  HIGH: { label: "High", color: "#dc2626", bg: "#fef2f2", icon: "↑" },
  URGENT: { label: "Urgent", color: "#9333ea", bg: "#faf5ff", icon: "⚑" },
};

const DEFAULT_PRIORITY_CONFIG = {
  label: "Medium",
  color: "#d97706",
  bg: "#fffbeb",
  icon: "→",
};

const local = {
  greeting: {
    fontSize: "14px",
    color: "#71717a",
    margin: "0 0 4px",
  },
  subHeading: {
    fontSize: "15px",
    color: "#3f3f46",
    margin: "0 0 24px",
    lineHeight: "1.5",
  },
  taskCard: {
    backgroundColor: "#fafafa",
    border: "1px solid #e4e4e7",
    borderRadius: "10px",
    padding: "20px",
    marginBottom: "24px",
  },
  taskMeta: {
    marginBottom: "12px",
  },
  priorityBadge: {
    display: "inline-block",
    fontSize: "11px",
    fontWeight: "600",
    padding: "3px 8px",
    borderRadius: "4px",
    border: "1px solid transparent",
    margin: "0 6px 0 0",
    letterSpacing: "0.2px",
  },
  projectBadge: {
    display: "inline-block",
    fontSize: "11px",
    color: "#71717a",
    margin: "0",
  },
  taskTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#09090b",
    margin: "0 0 8px",
    lineHeight: "1.4",
  },
  taskDescription: {
    fontSize: "14px",
    color: "#52525b",
    lineHeight: "1.6",
    margin: "0",
    whiteSpace: "normal" as const,
  },
  taskDivider: {
    borderColor: "#e4e4e7",
    margin: "16px 0",
  },
  taskFooter: {
    marginTop: "8px",
  },
  dueDateText: {
    fontSize: "13px",
    color: "#71717a",
    margin: "0",
  },
  hint: {
    fontSize: "13px",
    color: "#71717a",
    lineHeight: "1.5",
    margin: "0",
  },
};

export function TaskAssignedEmail({
  assigneeName,
  assignerName,
  taskTitle,
  taskDescription,
  priority,
  projectName,
  taskUrl,
  dueDate,
}: TaskAssignedEmailProps) {
  const priorityConfig = PRIORITY_CONFIG[priority] ?? DEFAULT_PRIORITY_CONFIG;
  const firstName = assigneeName.split(" ")[0] ?? assigneeName;

  return (
    <EmailShell
      preview={`${assignerName} assigned you a task in ${projectName}`}
    >
      <Text style={local.greeting}>Hi {firstName},</Text>

      <Heading style={styles.heading}>You have a new task</Heading>

      <Text style={local.subHeading}>
        <strong>{assignerName}</strong> assigned you a task in{" "}
        <strong>{projectName}</strong>.
      </Text>

      <Section style={local.taskCard}>
        <Section style={local.taskMeta}>
          <Text
            style={{
              ...local.priorityBadge,
              color: priorityConfig.color,
              backgroundColor: priorityConfig.bg,
              borderColor: priorityConfig.color + "33",
            }}
          >
            {priorityConfig.icon} {priorityConfig.label} priority
          </Text>
          <Text style={local.projectBadge}>📁 {projectName}</Text>
        </Section>

        <Text style={local.taskTitle}>{taskTitle}</Text>

        {taskDescription && (
          <Text style={local.taskDescription}>{taskDescription}</Text>
        )}

        <Hr style={local.taskDivider} />

        <Section style={local.taskFooter}>
          {dueDate ? (
            <Text style={local.dueDateText}>
              📅 Due{" "}
              {new Date(dueDate).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </Text>
          ) : (
            <Text style={local.dueDateText}>📅 No due date set</Text>
          )}
        </Section>
      </Section>

      <Section style={styles.ctaSection}>
        <Button href={taskUrl} style={styles.ctaButton}>
          View task →
        </Button>
      </Section>

      <Text style={local.hint}>
        You can update the task status, add comments, and track progress
        directly in Shipyard.
      </Text>
    </EmailShell>
  );
}

TaskAssignedEmail.PreviewProps = {
  assigneeName: "Jordan Lee",
  assignerName: "Alex Johnson",
  taskTitle: "Implement OAuth flow with Google",
  taskDescription:
    "Set up Google OAuth using NextAuth. Make sure to handle token refresh.",
  priority: "HIGH",
  projectName: "Backend v2",
  orgName: "Acme Corp",
  dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  taskUrl: "https://shipyard.dev/acme/projects/backend-v2/tasks/task-42",
} satisfies TaskAssignedEmailProps;

export default TaskAssignedEmail;

export async function renderTaskAssignedEmail(
  props: TaskAssignedEmailProps,
): Promise<string> {
  return render(<TaskAssignedEmail {...props} />);
}
