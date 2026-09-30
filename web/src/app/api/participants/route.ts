import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createParticipantProfileSchema } from "@/lib/validation";
import { getChainParticipant, normalizeAddress, DB_TO_CHAIN_ROLE_MAP } from "@/lib/chain";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * GET /api/participants
 * List participant profiles stored in the off-chain database.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roleParam = searchParams.get("role");

    const where: any = {};
    if (roleParam && ["MANUFACTURER", "DISTRIBUTOR", "RETAILER"].includes(roleParam.toUpperCase())) {
      where.role = roleParam.toUpperCase();
    }

    const participants = await prisma.participant.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess({ participants });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * POST /api/participants
 * Saves a participant profile after verifying that the participant is already registered on-chain.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createParticipantProfileSchema.parse(body);
    const walletAddress = normalizeAddress(validated.walletAddress);

    // 1. Verify that the participant is registered on the blockchain
    const chainInfo = await getChainParticipant(walletAddress);
    if (!chainInfo || chainInfo.role === 0) {
      return apiError(
        "NOT_REGISTERED_ON_CHAIN",
        "The participant wallet is not registered on the smart contract. Register on-chain first via Admin.",
        400
      );
    }

    // 2. Verify that the submitted role matches the on-chain role
    const expectedChainRole = DB_TO_CHAIN_ROLE_MAP[validated.role];
    if (chainInfo.role !== expectedChainRole) {
      return apiError(
        "ROLE_MISMATCH",
        `Submitted role (${validated.role}) does not match the on-chain registered role (${chainInfo.roleName})`,
        400
      );
    }

    // 3. Upsert participant profile in PostgreSQL
    const profile = await prisma.participant.upsert({
      where: { walletAddress },
      create: {
        walletAddress,
        role: validated.role,
        isActive: chainInfo.active,
        organizationName: validated.organizationName,
        contactEmail: validated.contactEmail,
        location: validated.location || null,
      },
      update: {
        organizationName: validated.organizationName,
        contactEmail: validated.contactEmail,
        location: validated.location || null,
        isActive: chainInfo.active,
      },
    });

    return apiSuccess({ participant: profile }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
