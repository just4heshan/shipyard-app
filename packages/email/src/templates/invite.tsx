import {
  Button,
  Heading,
  Hr,
  Section,
  Text,
  render,
} from "@react-email/components";
import { EmailShell, styles } from "../components/email-shell";

export interface InviteEmailProps {
  inviterName: string;
  inviterEmail: string;
  orgName: string;
  role: string;
  inviteUrl: string;
  expiryDays: number;
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  OWNER: "full administrative control",
  ADMIN: "manage projects and members",
  MEMBER: "create and update tasks",
  VIEWER: "view projects and tasks",
};

const local = {
  orgAvatarWrap: {
    marginBottom: "20px",
  },
  orgAvatar: {
    display: "inline-block",
    width: "48px",
    height: "48px",
    lineHeight: "48px",
    backgroundColor: "#18181b",
    color: "#fafafa",
    fontSize: "18px",
    fontWeight: "700",
    borderRadius: "10px",
    textAlign: "center" as const,
    margin: "0",
  },
  orgName: {
    color: "#18181b",
  },
  rolePill: {
    backgroundColor: "#f4f4f5",
    color: "#18181b",
    padding: "2px 8px",
    borderRadius: "4px",
    fontWeight: "600",
    fontSize: "13px",
    border: "1px solid #e4e4e7",
  },
  expiry: {
    fontSize: "13px",
    color: "#71717a",
    lineHeight: "1.5",
    margin: "0 0 24px",
  },
  featureRow: {
    marginTop: "4px",
  },
  featureItem: {
    marginBottom: "12px",
  },
  featureIcon: {
    fontSize: "18px",
    margin: "0 0 2px",
    display: "inline",
  },
  featureLabel: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#09090b",
    margin: "0 0 2px",
    display: "inline",
    marginLeft: "6px",
  },
  featureDesc: {
    fontSize: "13px",
    color: "#71717a",
    margin: "0",
    paddingLeft: "24px",
  },
};

function FeatureItem({
  icon,
  label,
  desc,
}: {
  icon: string;
  label: string;
  desc: string;
}) {
  return (
    <Section style={local.featureItem}>
      <Text style={local.featureIcon}>{icon}</Text>
      <Text style={local.featureLabel}>{label}</Text>
      <Text style={local.featureDesc}>{desc}</Text>
    </Section>
  );
}

export function InviteEmail({
  inviterName,
  inviterEmail,
  orgName,
  role,
  inviteUrl,
  expiryDays,
}: InviteEmailProps) {
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  const roleDescription = ROLE_DESCRIPTIONS[role] ?? "collaborate on projects";

  return (
    <EmailShell
      preview={`${inviterName} invited you to join ${orgName} on Shipyard`}
    >
      <Section style={local.orgAvatarWrap}>
        <Text style={local.orgAvatar}>
          {orgName.slice(0, 2).toUpperCase()}
        </Text>
      </Section>

      <Heading style={styles.heading}>
        You&apos;re invited to join{" "}
        <span style={local.orgName}>{orgName}</span>
      </Heading>

      <Text style={styles.body_text}>
        <strong>{inviterName}</strong> ({inviterEmail}) has invited you to
        collaborate on <strong>{orgName}</strong> as a{" "}
        <span style={local.rolePill}>{roleLabel}</span> — with access to{" "}
        {roleDescription}.
      </Text>

      <Section style={styles.ctaSection}>
        <Button href={inviteUrl} style={styles.ctaButton}>
          Accept invitation →
        </Button>
      </Section>

      <Text style={local.expiry}>
        This invitation expires in {expiryDays}{" "}
        {expiryDays === 1 ? "day" : "days"}. If you weren&apos;t expecting
        this, you can safely ignore this email.
      </Text>

      <Hr style={styles.divider} />

      <Section style={local.featureRow}>
        <FeatureItem
          icon="📋"
          label="Kanban Boards"
          desc="Visual task management for your team"
        />
        <FeatureItem
          icon="⚡"
          label="Real-time Updates"
          desc="See changes as they happen, live"
        />
        <FeatureItem
          icon="💬"
          label="Comments & Mentions"
          desc="Collaborate directly on tasks"
        />
      </Section>
    </EmailShell>
  );
}

InviteEmail.PreviewProps = {
  inviterName: "Alex Johnson",
  inviterEmail: "alex@acme.com",
  orgName: "Acme Corp",
  role: "MEMBER",
  inviteUrl: "https://shipyard.dev/invite/abc123",
  expiryDays: 7,
} satisfies InviteEmailProps;

export default InviteEmail;

export async function renderInviteEmail(
  props: InviteEmailProps,
): Promise<string> {
  return render(<InviteEmail {...props} />);
}
