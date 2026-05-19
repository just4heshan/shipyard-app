import { logger } from "@shipyard/logger";
import { initTRPC, TRPCError } from "@trpc/server";
import type { Session } from "next-auth";
import type { Context } from "./context";

// Narrows session.user to be definitely present with a required id.
// The guard in protectedProcedure guarantees this at runtime.
// auth.d.ts lives in apps/web and doesn't reach this package,
// so we explicitly assert id as string rather than relying on the augmented type.
type ProtectedContext = Omit<Context, "session"> & {
  session: Omit<Session, "user"> & {
    user: NonNullable<Session["user"]> & { id: string };
  };
};

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    if (error.code === "INTERNAL_SERVER_ERROR") {
      logger.error("Unhandled tRPC error", {
        code: error.code,
        message: error.message,
      });
    }
    return shape;
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user?.id) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: ctx as ProtectedContext });
});
