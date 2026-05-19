import {
  Button,
  Heading,
  render,
  Section,
  Text,
} from "@react-email/components";
import { EmailShell, styles } from "../components/email-shell";

export interface SubscriptionReactivatedEmailProps {
  ownerName: string;
  orgName: string;
  periodEnd: string;
  billingUrl: string;
}

export function SubscriptionReactivatedEmail({
  ownerName,
  orgName,
  periodEnd,
  billingUrl,
}: SubscriptionReactivatedEmailProps) {
  return (
    <EmailShell preview={`Your ${orgName} Pro plan has been reactivated`}>
      <Text style={styles.badge}>✅ Plan Reactivated</Text>
      <Heading style={styles.heading}>
        Your Pro plan is back, {ownerName}!
      </Heading>
      <Text style={styles.body_text}>
        Great news — your <strong>{orgName}</strong> Pro subscription has been
        reactivated. Your workspace will continue uninterrupted and your next
        billing date is <strong>{periodEnd}</strong>.
      </Text>
      <Section style={styles.ctaSection}>
        <Button href={billingUrl} style={styles.ctaButton}>
          View billing details →
        </Button>
      </Section>
    </EmailShell>
  );
}

SubscriptionReactivatedEmail.PreviewProps = {
  ownerName: "Alex",
  orgName: "Acme Corp",
  periodEnd: "June 15, 2026",
  billingUrl: "https://shipyard.dev/acme/org-settings/billing",
} satisfies SubscriptionReactivatedEmailProps;

export default SubscriptionReactivatedEmail;

export async function renderSubscriptionReactivatedEmail(
  props: SubscriptionReactivatedEmailProps
): Promise<string> {
  return render(<SubscriptionReactivatedEmail {...props} />);
}
