import {
  Button,
  Heading,
  Hr,
  render,
  Section,
  Text,
} from "@react-email/components";
import { EmailShell, styles } from "../components/email-shell";

export interface SubscriptionUpgradeEmailProps {
  ownerName: string;
  orgName: string;
  billingUrl: string;
  periodEnd: string;
}

export function SubscriptionUpgradeEmail({
  ownerName,
  orgName,
  billingUrl,
  periodEnd,
}: SubscriptionUpgradeEmailProps) {
  return (
    <EmailShell preview={`Your ${orgName} workspace is now on Pro`}>
      <Text style={styles.badge}>⚡ Pro Plan Activated</Text>
      <Heading style={styles.heading}>Welcome to Pro, {ownerName}!</Heading>
      <Text style={styles.body_text}>
        Your <strong>{orgName}</strong> workspace has been upgraded to the{" "}
        <strong>Pro plan</strong>. You now have access to unlimited projects, up
        to 25 members per org, and priority support.
      </Text>
      <Text style={styles.meta}>
        Your next billing date is <strong>{periodEnd}</strong>.
      </Text>
      <Section style={styles.ctaSection}>
        <Button href={billingUrl} style={styles.ctaButton}>
          View billing details →
        </Button>
      </Section>
      <Hr style={styles.divider} />
      <Text style={styles.note}>
        Questions about your subscription? Reply to this email or visit your
        billing settings.
      </Text>
    </EmailShell>
  );
}

SubscriptionUpgradeEmail.PreviewProps = {
  ownerName: "Alex",
  orgName: "Acme Corp",
  billingUrl: "https://shipyard.dev/acme/org-settings/billing",
  periodEnd: "June 15, 2026",
} satisfies SubscriptionUpgradeEmailProps;

export default SubscriptionUpgradeEmail;

export async function renderSubscriptionUpgradeEmail(
  props: SubscriptionUpgradeEmailProps
): Promise<string> {
  return render(<SubscriptionUpgradeEmail {...props} />);
}
