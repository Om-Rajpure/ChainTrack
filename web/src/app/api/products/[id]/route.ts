import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getChainProduct } from "@/lib/chain";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * GET /api/products/:id
 * Fetches product metadata by database id (draftId) or chainProductId.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rawId = params.id;
    const isNumeric = /^\d+$/.test(rawId);

    let product = null;

    if (isNumeric) {
      const chainId = parseInt(rawId, 10);
      product = await prisma.product.findFirst({
        where: {
          OR: [{ chainProductId: chainId }, { id: rawId }],
        },
      });
    } else {
      product = await prisma.product.findUnique({
        where: { id: rawId },
      });
    }

    if (!product) {
      return apiError("NOT_FOUND", `Product with ID '${rawId}' was not found in database`, 404);
    }

    // Optional chain synchronization snapshot
    let chainInfo = null;
    if (product.chainProductId) {
      try {
        chainInfo = await getChainProduct(product.chainProductId);
      } catch (err) {
        console.warn("Chain lookup failed during product fetch:", err);
      }
    }

    return apiSuccess({
      product,
      chainSnapshot: chainInfo,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
