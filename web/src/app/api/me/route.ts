import { getSession } from "@/lib/auth-session";
import { getChainParticipant, isChainAdmin } from "@/lib/chain";
import { prisma } from "@/lib/db";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return apiError("UNAUTHORIZED", "No active session found", 401);
    }

    const address = session.address.toLowerCase();

    // Check latest on-chain role/admin
    let role = session.role;
    let active = session.active;
    try {
      const isAdmin = await isChainAdmin(address);
      if (isAdmin) {
        role = "ADMIN";
        active = true;
      } else {
        const chainParticipant = await getChainParticipant(address);
        if (chainParticipant) {
          role = chainParticipant.roleName;
          active = chainParticipant.active;
        }
      }
    } catch {
      // Fallback to session state if chain unreachable
    }

    // Lookup profile in DB
    let profile = null;
    try {
      profile = await prisma.participant.findUnique({
        where: { walletAddress: address },
      });
    } catch {
      // Ignore DB read failure
    }

    return apiSuccess({
      address,
      role,
      active,
      profile,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
