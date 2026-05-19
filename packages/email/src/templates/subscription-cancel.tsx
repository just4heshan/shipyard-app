import {
  Button,
  Heading,
  Hr,
  render,
  Section,
  Text,
} from "@react-email/components";
import { EmailShell, styles } from "../components/email-shell";

export interface SubscriptionCancelScheduledEmailProps {
  ownerName: string;
  orgName: string;
  cancelDate: string;
  billingUrl: string;
}

export function SubscriptionCancelScheduledEmail({
  ownerName,
  orgName,
  cancelDate,
  billingUrl,
}: SubscriptionCancelScheduledEmailProps) {
  return (
    <EmailShell preview={`Your ${orgName} Pro plan will end on ${cancelDate}`}>
      <Text style={styles.badgeWarn}>📅 Cancellation Scheduled</Text>
      <Heading style={styles.heading}>
        Your Pro plan is scheduled to cancel
      </Heading>
      <Text style={styles.body_text}>
        Hi <strong>{ownerName}</strong>, we wanted to let you know that your{" "}
        <strong>{orgName}</strong> Pro subscription has been cancelled and will
        end on <strong>{cancelDate}</strong>.
      </Text>
      <Text style={styles.body_text}>
        Until then, you&apos;ll continue to have full access to all Pro
        features. After that date, your workspace will revert to the Free plan.
      </Text>
      <Section style={styles.ctaSection}>
        <Button href={billingUrl} style={styles.ctaButton}>
          Reactivate plan →
        </Button>
      </Section>
      <Hr style={styles.divider} />
      <Text style={styles.note}>
        Changed your mind? You can reactivate your subscription anytime before{" "}
        {cancelDate} from your billing settings.
      </Text>
    </EmailShell>
  );
}

SubscriptionCancelScheduledEmail.PreviewProps = {
  ownerName: "Alex",
  orgName: "Acme Corp",
  cancelDate: "June 15, 2026",
  billingUrl: "https://shipyard.dev/acme/org-settings/billing",
} satisfies SubscriptionCancelScheduledEmailProps;

export default SubscriptionCancelScheduledEmail;

export async function renderSubscriptionCancelScheduledEmail(
  props: SubscriptionCancelScheduledEmailProps
): Promise<string> {
  return render(<SubscriptionCancelScheduledEmail {...props} />);
}
