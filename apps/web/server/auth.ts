import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@shipyard/db";
import bcrypt from "bcryptjs";
import NextAuth, { type NextAuthResult } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";

const result: NextAuthResult = NextAuth({
  adapter: PrismaAdapter(db),
  // JWT strategy lets the Edge-runtime proxy verify sessions without a DB round-trip.
  // PrismaAdapter still handles user/account creation — sessions are just not DB-stored.
  session: { strategy: "jwt" },
  ...authConfig,
  providers: [
    // OAuth providers come from authConfig — spread them here so Credentials
    // can be added without duplicating the OAuth config in this file.
    ...authConfig.providers,
    Credentials({
      credentials: {
        email: { label: "Email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        const user = await db.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            emailVerified: true,
            password: { select: { hash: true } },
          },
        });

        // No account or no password row (OAuth-only user)
        if (!user?.password) return null;

        const isValid = await bcrypt.compare(password, user.password.hash);
        if (!isValid) return null;

        // Check email verification after password — avoids timing oracle on
        // unverified status for accounts whose password is wrong anyway.
        if (!user.emailVerified) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
});

export const handlers: NextAuthResult["handlers"] = result.handlers;
export const auth: NextAuthResult["auth"] = result.auth;
export const signIn: NextAuthResult["signIn"] = result.signIn;
export const signOut: NextAuthResult["signOut"] = result.signOut;
