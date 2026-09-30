import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { patchParticipantProfileSchema, ethereumAddressSchema } from "@/lib/validation";
import { getChainParticipant, normalizeAddress } from "@/lib/chain";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/participants/:address
 * Updates an existing participant profile.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const rawAddress = params.address;
    const validatedAddress = ethereumAddressSchema.parse(rawAddress);
    const walletAddress = normalizeAddress(validatedAddress);

    const body = await request.json();
    const validatedData = patchParticipantProfileSchema.parse(body);

    // Check if participant exists in database
    const existing = await prisma.participant.findUnique({
      where: { walletAddress },
    });

    if (!existing) {
      return apiError("NOT_FOUND", "Participant profile not found in database", 404);
    }

    // Refresh active status from chain if available
    let isActive = existing.isActive;
    try {
      const chainInfo = await getChainParticipant(walletAddress);
      if (chainInfo) {
        isActive = chainInfo.active;
      }
    } catch {
      // Keep existing active flag if chain is unreachable
    }

    const updated = await prisma.participant.update({
      where: { walletAddress },
      data: {
        ...(validatedData.organizationName !== undefined
          ? { organizationName: validatedData.organizationName }
          : {}),
        ...(validatedData.contactEmail !== undefined
          ? { contactEmail: validatedData.contactEmail }
          : {}),
        ...(validatedData.location !== undefined
          ? { location: validatedData.location }
          : {}),
        isActive,
      },
    });

    return apiSuccess({ participant: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
