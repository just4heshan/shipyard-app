import { authConfig } from "./auth.config";
import NextAuth, { type NextAuthResult } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@shipyard/db";

const result: NextAuthResult = NextAuth({
  adapter: PrismaAdapter(db),
  // JWT strategy lets the Edge-runtime proxy verify sessions without a DB round-trip.
  // PrismaAdapter still handles user/account creation — sessions are just not DB-stored.
  session: { strategy: "jwt" },
  ...authConfig,
});

export const handlers: NextAuthResult["handlers"] = result.handlers;
export const auth: NextAuthResult["auth"] = result.auth;
export const signIn: NextAuthResult["signIn"] = result.signIn;
export const signOut: NextAuthResult["signOut"] = result.signOut;
