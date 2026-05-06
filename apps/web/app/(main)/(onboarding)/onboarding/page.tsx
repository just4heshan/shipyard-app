import type { Metadata } from "next";
import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { db } from "@shipyard/db";
import { SetupOrgForm } from "./setup-org-form";

export const metadata: Metadata = { title: "Set up your organization" };

export default async function OnboardingPage() {
  const session = await auth();
  if (!session) redirect("/login");

  // Already has at least one org — skip onboarding
  const existing = await db.member.findFirst({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (existing) redirect("/dashboard");

  return <SetupOrgForm />;
}
