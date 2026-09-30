import { runIndexerSync } from "@/lib/indexer";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * POST /api/sync
 * Triggers an on-demand event synchronization run for the blockchain indexer.
 */
export async function POST() {
  try {
    const result = await runIndexerSync();
    if (!result.synced && result.message.includes("missing")) {
      return apiError("INDEXER_ERROR", result.message, 500);
    }

    return apiSuccess({
      synced: result.synced,
      fromBlock: result.fromBlock,
      toBlock: result.toBlock,
      eventsProcessed: result.eventsProcessed,
      affectedProducts: result.affectedProducts,
      message: result.message,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
