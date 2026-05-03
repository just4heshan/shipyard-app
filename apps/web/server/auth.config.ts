import type { NextAuthConfig } from "next-auth"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    // Used by proxy.ts (Edge Runtime) to decide if a request is authorized.
    // Redirects unauthenticated users to /login for protected routes.
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isProtected =
        request.nextUrl.pathname.startsWith("/dashboard") ||
        request.nextUrl.pathname.startsWith("/org");
      if (isProtected) return isLoggedIn;
      return true;
    },
    // Persist user.id into the JWT on first sign-in so it survives across requests
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    // Expose token.id as session.user.id so pages/routers can read it
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
} satisfies NextAuthConfig