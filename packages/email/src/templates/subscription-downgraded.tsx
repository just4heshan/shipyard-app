import {
  Button,
  Heading,
  render,
  Section,
  Text,
} from "@react-email/components";
import { EmailShell, styles } from "../components/email-shell";

export interface SubscriptionDowngradedEmailProps {
  ownerName: string;
  orgName: string;
  billingUrl: string;
}

export function SubscriptionDowngradedEmail({
  ownerName,
  orgName,
  billingUrl,
}: SubscriptionDowngradedEmailProps) {
  return (
    <EmailShell
      preview={`Your ${orgName} workspace has moved to the Free plan`}
    >
      <Text style={styles.badgeNeutral}>📦 Now on Free Plan</Text>
      <Heading style={styles.heading}>Your Pro plan has ended</Heading>
      <Text style={styles.body_text}>
        Hi <strong>{ownerName}</strong>, your <strong>{orgName}</strong> Pro
        subscription has ended and the workspace has moved to the Free plan.
      </Text>
      <Text style={styles.body_text}>
        You can still access your projects and data. Some Pro features — like
        additional members and unlimited projects — will no longer be available
        unless you upgrade again.
      </Text>
      <Section style={styles.ctaSection}>
        <Button href={billingUrl} style={styles.ctaButton}>
          Upgrade to Pro →
        </Button>
      </Section>
    </EmailShell>
  );
}

SubscriptionDowngradedEmail.PreviewProps = {
  ownerName: "Alex",
  orgName: "Acme Corp",
  billingUrl: "https://shipyard.dev/acme/org-settings/billing",
} satisfies SubscriptionDowngradedEmailProps;

export default SubscriptionDowngradedEmail;

export async function renderSubscriptionDowngradedEmail(
  props: SubscriptionDowngradedEmailProps
): Promise<string> {
  return render(<SubscriptionDowngradedEmail {...props} />);
}
