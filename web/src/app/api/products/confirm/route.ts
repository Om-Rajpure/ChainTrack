import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { confirmProductSchema } from "@/lib/validation";
import { getChainProduct, CHAIN_STATUS_MAP, type ChainProductInfo } from "@/lib/chain";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-response";

/**
 * POST /api/products/confirm
 * Binds an off-chain metadata draft to the confirmed on-chain product.
 * Verifies on-chain dataHash and manufacturer address before marking confirmed.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { draftId, productId, txHash } = confirmProductSchema.parse(body);

    // 1. Fetch draft from database
    const draft = await prisma.product.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      return apiError("DRAFT_NOT_FOUND", `Draft with id ${draftId} does not exist`, 404);
    }

    if (draft.isConfirmed) {
      return apiError(
        "ALREADY_CONFIRMED",
        `Product draft is already confirmed with chain product ID ${draft.chainProductId}`,
        409
      );
    }

    if (draft.draftExpiresAt && draft.draftExpiresAt.getTime() < Date.now()) {
      return apiError(
        "DRAFT_EXPIRED",
        "The draft has expired (>24 hours). Please create a new draft before registering on-chain.",
        400
      );
    }

    // 2. Query blockchain for on-chain state
    let chainProduct: ChainProductInfo | null = null;
    try {
      chainProduct = await getChainProduct(productId);
    } catch (chainErr: any) {
      return apiError(
        "CHAIN_READ_ERROR",
        `Failed to verify product on the blockchain: ${chainErr?.message || "RPC unavailable"}`,
        502
      );
    }

    if (!chainProduct) {
      return apiError(
        "INVALID_CHAIN_PRODUCT",
        `Product ID ${productId} does not exist on the smart contract`,
        400
      );
    }

    // 3. Verify on-chain dataHash matches draft dataHash
    if (chainProduct.dataHash.toLowerCase() !== draft.dataHash.toLowerCase()) {
      return apiError(
        "HASH_MISMATCH",
        `Blockchain dataHash (${chainProduct.dataHash}) does not match draft dataHash (${draft.dataHash})`,
        400
      );
    }

    // 4. Verify on-chain manufacturer matches draft manufacturer address
    if (chainProduct.manufacturer.toLowerCase() !== draft.manufacturerAddress.toLowerCase()) {
      return apiError(
        "MANUFACTURER_MISMATCH",
        `Blockchain creator (${chainProduct.manufacturer}) does not match draft manufacturer (${draft.manufacturerAddress})`,
        400
      );
    }

    // 5. Ensure chainProductId is not already bound to another row
    const existingBinding = await prisma.product.findUnique({
      where: { chainProductId: productId },
    });

    if (existingBinding && existingBinding.id !== draft.id) {
      return apiError(
        "CHAIN_ID_ALREADY_BOUND",
        `Chain product ID ${productId} is already bound to another database record (${existingBinding.id})`,
        409
      );
    }

    // 6. Update product to confirmed state in PostgreSQL
    const currentStatus = CHAIN_STATUS_MAP[chainProduct.status] || "CREATED";

    const confirmedProduct = await prisma.product.update({
      where: { id: draft.id },
      data: {
        chainProductId: productId,
        isConfirmed: true,
        registrationTxHash: txHash,
        draftExpiresAt: null,
        currentOwner: chainProduct.currentOwner || draft.manufacturerAddress,
        pendingReceiver: chainProduct.pendingReceiver || null,
        currentStatus,
      },
    });

    return apiSuccess({ product: confirmedProduct });
  } catch (err) {
    return handleApiError(err);
  }
}
