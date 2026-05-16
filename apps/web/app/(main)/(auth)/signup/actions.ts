"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { db } from "@shipyard/db";
import { sendEmail, renderVerifyEmail } from "@shipyard/email";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be under 72 characters"), // bcrypt truncates at 72
});

export type RegisterState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

export async function register(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  };
  const callbackUrl = (formData.get("callbackUrl") as string | null) ?? undefined;

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { name, email, password } = parsed.data;

  // Check if an account already exists with this email
  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true, accounts: { select: { provider: true } } },
  });

  if (existing) {
    const providers = existing.accounts.map((a) => a.provider).join(" or ");
    const hint = providers
      ? `Please sign in with ${providers}.`
      : "Please sign in with your existing account.";
    return {
      status: "error",
      message: `An account with this email already exists. ${hint}`,
    };
  }

  try {
    const hash = await bcrypt.hash(password, 12);

    await db.user.create({
      data: {
        name,
        email,
        // emailVerified stays null until they click the verification link
        password: { create: { hash } },
      },
      select: { id: true },
    });

    // Secure random token, expires in 24 hours
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.verificationToken.create({
      data: { identifier: email, token, expires },
    });

    const cbParam = callbackUrl ? `&callbackUrl=${encodeURIComponent(callbackUrl)}` : "";
    const verifyUrl = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}&email=${encodeURIComponent(email)}${cbParam}`;

    const html = await renderVerifyEmail({ name, verifyUrl });
    await sendEmail({
      to: email,
      subject: "Verify your Shipyard account",
      html,
      templateName: "verify-email",
      templateData: { email },
      db,
    });
  } catch (err) {
    console.error("[register] unexpected error:", err);
    return {
      status: "error",
      message: "Something went wrong. Please try again.",
    };
  }

  return { status: "success" };
}
