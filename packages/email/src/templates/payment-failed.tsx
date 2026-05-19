import {
  Button,
  Heading,
  Hr,
  render,
  Section,
  Text,
} from "@react-email/components";
import { EmailShell, styles } from "../components/email-shell";

export interface PaymentFailedEmailProps {
  ownerName: string;
  orgName: string;
  billingUrl: string;
}

export function PaymentFailedEmail({
  ownerName,
  orgName,
  billingUrl,
}: PaymentFailedEmailProps) {
  return (
    <EmailShell preview={`Action required: payment failed for ${orgName}`}>
      <Text style={styles.badgeWarn}>⚠️ Payment Failed</Text>
      <Heading style={styles.heading}>
        Your payment didn&apos;t go through
      </Heading>
      <Text style={styles.body_text}>
        Hi <strong>{ownerName}</strong>, we weren&apos;t able to process the
        payment for your <strong>{orgName}</strong> Pro subscription.
      </Text>
      <Text style={styles.body_text}>
        Your workspace has been moved to the Free plan. Update your payment
        method to restore Pro access — your projects and data are untouched.
      </Text>
      <Section style={styles.ctaSection}>
        <Button href={billingUrl} style={styles.ctaButton}>
          Update payment method →
        </Button>
      </Section>
      <Hr style={styles.divider} />
      <Text style={styles.note}>
        If you believe this is an error, contact your bank or reply to this
        email and we&apos;ll help sort it out.
      </Text>
    </EmailShell>
  );
}

PaymentFailedEmail.PreviewProps = {
  ownerName: "Alex",
  orgName: "Acme Corp",
  billingUrl: "https://shipyard.dev/acme/org-settings/billing",
} satisfies PaymentFailedEmailProps;

export default PaymentFailedEmail;

export async function renderPaymentFailedEmail(
  props: PaymentFailedEmailProps
): Promise<string> {
  return render(<PaymentFailedEmail {...props} />);
}
