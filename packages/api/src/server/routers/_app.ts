import { router } from "../trpc";
import { organizationRouter } from "./organization";

export const appRouter = router({
  organization: organizationRouter,
});

export type AppRouter = typeof appRouter;