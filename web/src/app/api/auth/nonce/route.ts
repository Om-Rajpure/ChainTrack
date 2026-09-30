import { NextRequest } from "next/server";
import { issueNonce } from "@/lib/auth-nonce";
import { authNonceQuerySchema } from "@/lib/validation";
import { apiSuccess, handleApiError, apiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawAddress = searchParams.get("address");

    if (!rawAddress) {
      return apiError("VALIDATION_ERROR", "The 'address' query parameter is required", 400);
    }

    const { address } = authNonceQuerySchema.parse({ address: rawAddress });
    const nonceData = await issueNonce(address);

    return apiSuccess({
      address: nonceData.address,
      nonce: nonceData.nonce,
      expiresAt: nonceData.expiresAt.toISOString(),
      domain: request.headers.get("host") || "localhost:3000",
      statement: "Sign in with Ethereum to ChainTrack Supply Chain Tracker",
    });
  } catch (err) {
    return handleApiError(err);
  }
}
