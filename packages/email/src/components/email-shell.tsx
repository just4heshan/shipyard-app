import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

export function EmailShell({
  preview,
  children,
}: {
  preview: string;
  children: ReactNode;
}) {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.brand}>⚓ Shipyard</Text>
          </Section>
          <Section style={styles.content}>{children}</Section>
          <Section style={styles.footer}>
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

export const styles = {
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
  badge: {
    display: "inline-block",
    backgroundColor: "#ecfdf5",
    color: "#059669",
    fontSize: "12px",
    fontWeight: "600",
    padding: "4px 10px",
    borderRadius: "999px",
    border: "1px solid #d1fae5",
    margin: "0 0 16px",
  },
  badgeWarn: {
    display: "inline-block",
    backgroundColor: "#fff7ed",
    color: "#ea580c",
    fontSize: "12px",
    fontWeight: "600",
    padding: "4px 10px",
    borderRadius: "999px",
    border: "1px solid #fed7aa",
    margin: "0 0 16px",
  },
  badgeNeutral: {
    display: "inline-block",
    backgroundColor: "#f4f4f5",
    color: "#52525b",
    fontSize: "12px",
    fontWeight: "600",
    padding: "4px 10px",
    borderRadius: "999px",
    border: "1px solid #e4e4e7",
    margin: "0 0 16px",
  },
  heading: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#09090b",
    letterSpacing: "-0.5px",
    margin: "0 0 16px",
    lineHeight: "1.3",
  },
  body_text: {
    fontSize: "15px",
    color: "#3f3f46",
    lineHeight: "1.6",
    margin: "0 0 16px",
  },
  meta: {
    fontSize: "14px",
    color: "#71717a",
    margin: "0 0 24px",
  },
  ctaSection: {
    margin: "24px 0",
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
  divider: {
    borderColor: "#f4f4f5",
    margin: "24px 0",
  },
  note: {
    fontSize: "13px",
    color: "#71717a",
    lineHeight: "1.5",
    margin: "0",
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
    margin: "0",
  },
};
