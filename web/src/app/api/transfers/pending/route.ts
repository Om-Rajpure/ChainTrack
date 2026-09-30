import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ethereumAddressSchema } from "@/lib/validation";
import { normalizeAddress } from "@/lib/chain";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * GET /api/transfers/pending?wallet=0x...
 * Returns pending incoming shipments addressed to the specified participant wallet.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawWallet = searchParams.get("wallet");

    if (!rawWallet) {
      return apiError("VALIDATION_ERROR", "The 'wallet' query parameter is required", 400);
    }

    const validatedAddress = ethereumAddressSchema.parse(rawWallet);
    const wallet = normalizeAddress(validatedAddress);

    const pendingTransfers = await prisma.product.findMany({
      where: {
        pendingReceiver: wallet,
        currentStatus: "IN_TRANSIT",
        isConfirmed: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return apiSuccess({
      transfers: pendingTransfers,
      count: pendingTransfers.length,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
