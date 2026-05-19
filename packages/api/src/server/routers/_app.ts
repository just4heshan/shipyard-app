import { router } from "../trpc";
import { activityLogRouter } from "./activityLog";
import { commentRouter } from "./comment";
import { memberRouter } from "./member";
import { organizationRouter } from "./organization";
import { projectRouter } from "./project";
import { socketRouter } from "./socket";
import { subscriptionRouter } from "./subscription";
import { taskRouter } from "./task";

export const appRouter = router({
  organization: organizationRouter,
  member: memberRouter,
  activityLog: activityLogRouter,
  project: projectRouter,
  task: taskRouter,
  comment: commentRouter,
  socket: socketRouter,
  subscription: subscriptionRouter,
});

export type AppRouter = typeof appRouter;
