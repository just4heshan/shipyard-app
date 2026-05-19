// `export {}` makes this a module file so `declare module` blocks are
// treated as augmentations (merging with next-auth's real types) rather
// than ambient declarations that replace them entirely.
export {};

declare module "next-auth" {
  interface Session {
    // Explicit fields — avoids DefaultSession["user"] which is typed User | undefined
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
