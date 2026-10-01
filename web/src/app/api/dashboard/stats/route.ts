import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeAddress } from "@/lib/chain";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard/stats
 * Aggregates database counts for dashboards (products by status, drafts, participants).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get("wallet");
    const role = searchParams.get("role");

    const productWhere: any = { isConfirmed: true };

    if (wallet) {
      const normalizedWallet = normalizeAddress(wallet);
      if (role === "MANUFACTURER") {
        productWhere.manufacturerAddress = normalizedWallet;
      } else if (role === "DISTRIBUTOR" || role === "RETAILER") {
        productWhere.OR = [
          { currentOwner: normalizedWallet },
          { pendingReceiver: normalizedWallet },
        ];
      }
    }

    const [
      totalConfirmed,
      pendingDrafts,
      statusGroups,
      totalParticipants,
      participantsByRole,
    ] = await Promise.all([
      prisma.product.count({ where: productWhere }),
      prisma.product.count({ where: { isConfirmed: false } }),
      prisma.product.groupBy({
        by: ["currentStatus"],
        where: productWhere,
        _count: { id: true },
      }),
      prisma.participant.count(),
      prisma.participant.groupBy({
        by: ["role"],
        _count: { id: true },
      }),
    ]);

    const countsByStatus: Record<string, number> = {
      CREATED: 0,
      IN_TRANSIT: 0,
      AT_DISTRIBUTOR: 0,
      AT_RETAILER: 0,
      SOLD: 0,
    };

    for (const group of statusGroups) {
      if (group.currentStatus) {
        countsByStatus[group.currentStatus] = group._count.id;
      }
    }

    const countsByRole: Record<string, number> = {
      MANUFACTURER: 0,
      DISTRIBUTOR: 0,
      RETAILER: 0,
    };

    for (const group of participantsByRole) {
      countsByRole[group.role] = group._count.id;
    }

    return apiSuccess({
      totalProducts: totalConfirmed,
      byStatus: countsByStatus,
      totalParticipants,
      byRole: countsByRole,
      pendingDrafts,
      stats: {
        products: {
          total: totalConfirmed,
          drafts: pendingDrafts,
          byStatus: countsByStatus,
        },
        participants: {
          total: totalParticipants,
          byRole: countsByRole,
        },
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
