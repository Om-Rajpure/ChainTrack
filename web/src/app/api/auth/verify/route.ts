import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { authVerifySchema } from "@/lib/validation";
import { validateAndConsumeNonce } from "@/lib/auth-nonce";
import { getChainParticipant, isChainAdmin } from "@/lib/chain";
import { apiError, handleApiError } from "@/lib/api-response";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth-session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, signature, nonce } = authVerifySchema.parse(body);

    // 1. Validate and consume the single-use nonce
    const nonceCheck = await validateAndConsumeNonce(address, nonce);
    if (!nonceCheck.valid) {
      return apiError(
        "INVALID_NONCE",
        nonceCheck.reason === "NONCE_EXPIRED"
          ? "Login nonce has expired. Please request a new nonce."
          : nonceCheck.reason === "NONCE_ALREADY_USED"
          ? "Login nonce has already been used. Replay detected."
          : "Invalid or nonexistent login nonce",
        400
      );
    }

    // 2. Verify signature foundation using ethers.js v6
    try {
      const messageToVerify = `Sign in with Ethereum to ChainTrack Supply Chain Tracker\nNonce: ${nonce}`;
      const recoveredAddress = ethers.verifyMessage(messageToVerify, signature).toLowerCase();

      if (recoveredAddress !== address) {
        return apiError("INVALID_SIGNATURE", "Recovered signer address does not match claimed address", 401);
      }
    } catch {
      return apiError("INVALID_SIGNATURE", "Cryptographic signature verification failed", 401);
    }

    // 3. Read participant role & admin status from blockchain
    let role = "NONE";
    let active = false;
    try {
      const isAdmin = await isChainAdmin(address);
      if (isAdmin) {
        role = "ADMIN";
        active = true;
      } else {
        const participantInfo = await getChainParticipant(address);
        if (participantInfo) {
          role = participantInfo.roleName;
          active = participantInfo.active;
        }
      }
    } catch (chainErr) {
      console.warn("Chain lookup during verify failed (offline mode):", chainErr);
    }

    // 4. Issue 12-hour session JWT token
    const token = await createSessionToken({ address, role, active });

    const response = NextResponse.json({
      data: {
        verified: true,
        address,
        role,
        active,
        token,
      },
    });

    // Set secure httpOnly cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 12 * 60 * 60, // 12 hours in seconds
      path: "/",
    });

    return response;
  } catch (err) {
    return handleApiError(err);
  }
}
