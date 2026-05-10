import jwt from "jsonwebtoken";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";

export const socketRouter = router({
  /** Issue a short-lived signed JWT the client passes to the socket server on connect.
   */
  socketToken: protectedProcedure.mutation(({ ctx }) => {
    const secret = process.env.SOCKET_SECRET;
    if (!secret) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "SOCKET_SECRET is not configured",
      });
    }

    const token = jwt.sign(
      { userId: ctx.session.user.id },
      secret,
      { expiresIn: "15m" },
    );

    return { token };
  }),
});
