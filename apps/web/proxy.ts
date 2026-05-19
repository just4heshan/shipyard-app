import NextAuth, { type NextAuthResult } from "next-auth";
import { authConfig } from "@/server/auth.config";

// Edge-safe: authConfig has no Prisma/Node.js-only dependencies.
// The full auth instance (auth.ts) is used in page/API routes only.
export const proxy: NextAuthResult["auth"] = NextAuth(authConfig).auth;
