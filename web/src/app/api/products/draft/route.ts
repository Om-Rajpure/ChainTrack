import { NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { createProductDraftSchema } from "@/lib/validation";
import { computeProductHash } from "@/lib/hash";
import { normalizeAddress } from "@/lib/chain";
import { apiSuccess, handleApiError, apiError } from "@/lib/api-response";

/**
 * POST /api/products/draft
 * Saves product metadata draft in PostgreSQL and computes the canonical dataHash.
 * Returns draftId, serialNumber, dataHash, and draftExpiresAt.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createProductDraftSchema.parse(body);
    const manufacturerWallet = normalizeAddress(validated.manufacturerWallet);

    // Opportunistic cleanup of expired unconfirmed drafts (24h lifecycle)
    try {
      await prisma.product.deleteMany({
        where: {
          isConfirmed: false,
          draftExpiresAt: {
            lt: new Date(),
          },
        },
      });
    } catch (cleanupErr) {
      console.warn("Draft cleanup failed (non-fatal):", cleanupErr);
    }

    // 1. Generate unique serialNumber (UUID v4)
    const serialNumber = crypto.randomUUID();

    // 2. Compute canonical product hash
    const dataHash = computeProductHash({
      serialNumber,
      name: validated.name,
      category: validated.category,
      description: validated.description,
      batchNumber: validated.batchNumber,
      manufacturingDate: validated.manufacturingDate,
      manufacturerWallet,
      attributes: (validated.attributes as Record<string, unknown>) || undefined,
      imageHash: validated.imageHash,
    });

    // 3. Ensure dataHash is not already used by an existing confirmed product
    const existing = await prisma.product.findUnique({
      where: { dataHash },
    });

    if (existing) {
      return apiError(
        "DUPLICATE_HASH",
        "A product with this identical canonical data hash is already registered or drafted",
        409
      );
    }

    // 4. Save draft in PostgreSQL
    const draftExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const product = await prisma.product.create({
      data: {
        serialNumber,
        dataHash,
        name: validated.name.trim(),
        category: validated.category.trim(),
        description: validated.description ? validated.description.trim() : null,
        batchNumber: validated.batchNumber.trim(),
        manufacturingDate: new Date(validated.manufacturingDate),
        attributes: validated.attributes ? (validated.attributes as any) : {},
        imageUrl: validated.imageUrl || null,
        imageHash: validated.imageHash || null,
        manufacturerAddress: manufacturerWallet,
        currentOwner: null,
        pendingReceiver: null,
        currentStatus: null,
        isConfirmed: false,
        draftExpiresAt,
      },
    });

    return apiSuccess(
      {
        draftId: product.id,
        serialNumber: product.serialNumber,
        dataHash: product.dataHash,
        draftExpiresAt: draftExpiresAt.toISOString(),
      },
      201
    );
  } catch (err) {
    return handleApiError(err);
  }
}
