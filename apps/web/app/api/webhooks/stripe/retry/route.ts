import { db } from "@shipyard/db";
import { logger } from "@shipyard/logger";
import { type NextRequest, NextResponse } from "next/server";
import { processRetryQueue } from "../_lib/retry";

/**
 * POST /api/webhooks/stripe/retry
 *
 * Processes all webhook events currently in the retry queue.
 * Called by Vercel Cron every minute — see vercel.json.
 *
 * Protected by CRON_SECRET to prevent unauthenticated triggers.
 */
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await processRetryQueue(db);
    logger.info("Retry queue processed", result);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Retry queue processor crashed", { error: message });
    return NextResponse.json(
      { error: "Internal error during retry processing" },
      { status: 500 }
    );
  }
}
