import { db } from "@shipyard/db";
import { redirect } from "next/navigation";

interface Props {
  searchParams: Promise<{ token?: string; email?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token, email } = await searchParams;

  // Missing params — link is malformed
  if (!token || !email) {
    return <VerifyMessage title="Invalid link" body="This verification link is missing required parameters." />;
  }

  const record = await db.verificationToken.findUnique({
    where: { identifier_token: { identifier: email, token } },
    select: { expires: true },
  });

  if (!record) {
    return (
      <VerifyMessage
        title="Link not found"
        body="This verification link is invalid or has already been used."
        linkHref="/login"
        linkLabel="Back to sign in"
      />
    );
  }

  if (record.expires < new Date()) {
    // Clean up the expired token
    await db.verificationToken.delete({
      where: { identifier_token: { identifier: email, token } },
    });
    return (
      <VerifyMessage
        title="Link expired"
        body="This verification link has expired. Please sign up again to receive a new one."
        linkHref="/signup"
        linkLabel="Sign up again"
      />
    );
  }

  // Mark the user as verified and remove the token in one transaction
  await db.$transaction([
    db.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    }),
    db.verificationToken.delete({
      where: { identifier_token: { identifier: email, token } },
    }),
  ]);

  redirect("/login?verified=true");
}

// ─── Small helper — keeps JSX out of the verification logic above ─────────────

function VerifyMessage({
  title,
  body,
  linkHref,
  linkLabel,
}: {
  title: string;
  body: string;
  linkHref?: string;
  linkLabel?: string;
}) {
  return (
    <div className="w-full max-w-sm space-y-4 text-center">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{body}</p>
      {linkHref && linkLabel && (
        <a
          href={linkHref}
          className="text-sm underline underline-offset-4"
        >
          {linkLabel}
        </a>
      )}
    </div>
  );
}
