import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  render,
} from "@react-email/components";

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
  const previewText = `${inviterName} invited you to join ${orgName} on Shipyard`;

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Brand header */}
          <Section style={styles.header}>
            <Text style={styles.brand}>⚓ Shipyard</Text>
          </Section>

          {/* Main content */}
          <Section style={styles.content}>
            {/* Org avatar placeholder */}
            <Section style={styles.orgAvatarWrap}>
              <Text style={styles.orgAvatar}>
                {orgName.slice(0, 2).toUpperCase()}
              </Text>
            </Section>

            <Heading style={styles.heading}>
              You&apos;re invited to join{" "}
              <span style={styles.orgName}>{orgName}</span>
            </Heading>

            <Text style={styles.body_text}>
              <strong>{inviterName}</strong> ({inviterEmail}) has invited you to
              collaborate on <strong>{orgName}</strong> as a{" "}
              <span style={styles.rolePill}>{roleLabel}</span> — with access to{" "}
              {roleDescription}.
            </Text>

            {/* CTA */}
            <Section style={styles.ctaSection}>
              <Button href={inviteUrl} style={styles.ctaButton}>
                Accept invitation →
              </Button>
            </Section>

            <Text style={styles.expiry}>
              This invitation expires in {expiryDays}{" "}
              {expiryDays === 1 ? "day" : "days"}. If you weren&apos;t
              expecting this, you can safely ignore this email.
            </Text>

            <Hr style={styles.divider} />

            {/* What is Shipyard */}
            <Section style={styles.featureRow}>
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
          </Section>

          {/* Footer */}
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              You received this email because{" "}
              <strong>{inviterName}</strong> {" "}sent you an invitation. If you
              weren&apos;t expecting this, no action is needed.
            </Text>
            <Text style={styles.footerText}>
              © {new Date().getFullYear()} Shipyard · Project management for
              development teams
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

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
    <Section style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureLabel}>{label}</Text>
      <Text style={styles.featureDesc}>{desc}</Text>
    </Section>
  );
}

export async function renderInviteEmail(
  props: InviteEmailProps,
): Promise<string> {
  return render(<InviteEmail {...props} />);
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = {
  body: {
    backgroundColor: "#f4f4f5",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    margin: "0",
    padding: "0",
  },
  container: {
    maxWidth: "540px",
    margin: "40px auto",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #e4e4e7",
    overflow: "hidden" as const,
  },
  header: {
    backgroundColor: "#09090b",
    padding: "20px 32px",
  },
  brand: {
    color: "#fafafa",
    fontSize: "18px",
    fontWeight: "700",
    letterSpacing: "-0.5px",
    margin: "0",
  },
  content: {
    padding: "32px",
  },
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
  heading: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#09090b",
    letterSpacing: "-0.5px",
    margin: "0 0 16px",
    lineHeight: "1.3",
  },
  orgName: {
    color: "#18181b",
  },
  body_text: {
    fontSize: "15px",
    color: "#3f3f46",
    lineHeight: "1.6",
    margin: "0 0 28px",
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
  ctaSection: {
    marginBottom: "24px",
  },
  ctaButton: {
    backgroundColor: "#09090b",
    color: "#fafafa",
    fontSize: "14px",
    fontWeight: "600",
    padding: "12px 24px",
    borderRadius: "8px",
    textDecoration: "none",
    display: "inline-block",
  },
  expiry: {
    fontSize: "13px",
    color: "#71717a",
    lineHeight: "1.5",
    margin: "0 0 24px",
  },
  divider: {
    borderColor: "#f4f4f5",
    margin: "24px 0",
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
  footer: {
    backgroundColor: "#fafafa",
    borderTop: "1px solid #f4f4f5",
    padding: "20px 32px",
  },
  footerText: {
    fontSize: "12px",
    color: "#a1a1aa",
    lineHeight: "1.5",
    margin: "0 0 4px",
  },
};
