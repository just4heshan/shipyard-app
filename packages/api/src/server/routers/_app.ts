import { router } from "../trpc";
import { organizationRouter } from "./organization";
import { memberRouter } from "./member";

export const appRouter = router({
  organization: organizationRouter,
  member: memberRouter,
});

export type AppRouter = typeof appRouter;
