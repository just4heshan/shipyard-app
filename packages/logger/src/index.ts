import { Logger } from "tslog";

/**
 * Shared logger instance for all Shipyard server-side code.
 */

const isProd = process.env.NODE_ENV === "production";

export const logger = new Logger({
  name: "shipyard",
  type: isProd ? "json" : "pretty",
  minLevel: isProd ? 3 : 2,
});
