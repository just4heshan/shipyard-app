import type { db as DB } from "@shipyard/db";
import type { Session } from "next-auth";

export interface Context {
  session: Session | null;
  db: typeof DB;
}
