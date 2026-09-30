import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getChainProduct, getChainHistory, type ChainProductInfo, type ChainHistoryInfo } from "@/lib/chain";
import { computeProductHash } from "@/lib/hash";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * GET /api/verify/:id
 * Public verification endpoint.
 * Reads blockchain source of truth, fetches off-chain descriptive details,
 * recomputes the canonical hash, and determines AUTHENTIC, DATA_MISMATCH, or NOT_FOUND.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rawId = params.id;
    if (!/^\d+$/.test(rawId)) {
      return apiError("INVALID_ID", "Product ID must be a positive integer", 400);
    }

    const productId = parseInt(rawId, 10);
    if (productId <= 0) {
      return apiSuccess({
        result: "NOT_FOUND",
        detailsAvailable: false,
        message: "Product ID does not exist on the blockchain",
      });
    }

    // 1. Read product and history directly from blockchain (trust anchor)
    let chainProduct: ChainProductInfo | null = null;
    let chainHistory: ChainHistoryInfo[] = [];
    try {
      chainProduct = await getChainProduct(productId);
      if (chainProduct) {
        chainHistory = await getChainHistory(productId);
      }
    } catch (chainErr) {
      console.warn("Blockchain query error during verification:", chainErr);
      return apiError("CHAIN_UNAVAILABLE", "Blockchain node is currently unreachable for verification", 503);
    }

    if (!chainProduct) {
      return apiSuccess({
        result: "NOT_FOUND",
        detailsAvailable: false,
        message: `Product #${productId} was not found on the smart contract`,
      });
    }

    // 2. Fetch descriptive product details from off-chain database
    let dbProduct = null;
    let dbAvailable = true;

    try {
      dbProduct = await prisma.product.findFirst({
        where: {
          chainProductId: productId,
          isConfirmed: true,
        },
      });
    } catch (dbErr) {
      console.warn("Database query error during verification (fallback to chain data):", dbErr);
      dbAvailable = false;
    }

    // 3. If DB is unavailable or product details are not in DB, return chain verification with detailsAvailable: false
    if (!dbAvailable || !dbProduct) {
      return apiSuccess({
        result: "AUTHENTIC",
        detailsAvailable: false,
        message: "Product exists on-chain with verified history, but descriptive off-chain details are not available in database.",
        chain: chainProduct,
        history: chainHistory,
      });
    }

    // 4. Recompute canonical hash from off-chain descriptive fields
    const recomputedHash = computeProductHash({
      serialNumber: dbProduct.serialNumber,
      name: dbProduct.name,
      category: dbProduct.category,
      description: dbProduct.description,
      batchNumber: dbProduct.batchNumber,
      manufacturingDate: dbProduct.manufacturingDate,
      manufacturerWallet: dbProduct.manufacturerAddress,
      attributes: (dbProduct.attributes as Record<string, unknown>) || undefined,
      imageHash: dbProduct.imageHash,
    });

    // 5. Compare recomputed hash against authoritative on-chain dataHash
    const isAuthentic =
      recomputedHash.toLowerCase() === chainProduct.dataHash.toLowerCase();

    const result = isAuthentic ? "AUTHENTIC" : "DATA_MISMATCH";

    return apiSuccess({
      result,
      detailsAvailable: true,
      dataIntegrity: {
        isAuthentic,
        onChainHash: chainProduct.dataHash,
        recomputedHash,
      },
      product: {
        id: dbProduct.id,
        chainProductId: dbProduct.chainProductId,
        serialNumber: dbProduct.serialNumber,
        name: dbProduct.name,
        category: dbProduct.category,
        description: dbProduct.description,
        batchNumber: dbProduct.batchNumber,
        manufacturingDate: dbProduct.manufacturingDate.toISOString().split("T")[0],
        attributes: dbProduct.attributes,
        imageUrl: dbProduct.imageUrl,
        imageHash: dbProduct.imageHash,
        manufacturerAddress: dbProduct.manufacturerAddress,
        registrationTxHash: dbProduct.registrationTxHash,
        createdAt: dbProduct.createdAt,
      },
      chain: chainProduct,
      history: chainHistory,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
