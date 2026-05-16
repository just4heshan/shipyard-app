import { Button, Heading, Hr, Section, Text, render } from "@react-email/components";
import { EmailShell, styles } from "../components/email-shell";

export interface VerifyEmailProps {
  name: string;
  verifyUrl: string;
}

export function VerifyEmail({ name, verifyUrl }: VerifyEmailProps) {
  return (
    <EmailShell preview="Verify your Shipyard account">
      <Text style={styles.badge}>✉️ Email verification</Text>
      <Heading style={styles.heading}>Welcome to Shipyard, {name}!</Heading>
      <Text style={styles.body_text}>
        Click the button below to verify your email address and activate your
        account. This link expires in <strong>24 hours</strong>.
      </Text>
      <Section style={styles.ctaSection}>
        <Button href={verifyUrl} style={styles.ctaButton}>
          Verify email →
        </Button>
      </Section>
      <Hr style={styles.divider} />
      <Text style={styles.note}>
        Or copy this link into your browser:
        <br />
        <a href={verifyUrl} style={{ color: "#09090b", wordBreak: "break-all" }}>
          {verifyUrl}
        </a>
      </Text>
      <Text style={{ ...styles.note, marginTop: "12px" }}>
        If you didn&apos;t create a Shipyard account you can safely ignore this email.
      </Text>
    </EmailShell>
  );
}

VerifyEmail.PreviewProps = {
  name: "Alex",
  verifyUrl: "https://shipyard.dev/verify-email?token=abc123&email=alex%40example.com",
} satisfies VerifyEmailProps;

export default VerifyEmail;

export async function renderVerifyEmail(props: VerifyEmailProps): Promise<string> {
  return render(<VerifyEmail {...props} />);
}
