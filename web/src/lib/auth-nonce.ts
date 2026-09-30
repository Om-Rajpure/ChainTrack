import crypto from "crypto";
import { prisma } from "./db";
import { normalizeAddress } from "./chain";

export const NONCE_EXPIRATION_MINUTES = 5;

/**
 * Generates a cryptographically secure random alphanumeric nonce.
 */
export function generateNonce(): string {
  return crypto.randomBytes(32).toString("hex");
}

export interface IssuedNonce {
  address: string;
  nonce: string;
  expiresAt: Date;
}

/**
 * Issues a 5-minute single-use nonce for the specified Ethereum address.
 * Deletes any expired or older unused nonces for this address to maintain cleanliness.
 */
export async function issueNonce(walletAddress: string): Promise<IssuedNonce> {
  const address = normalizeAddress(walletAddress);
  const nonce = generateNonce();
  const expiresAt = new Date(Date.now() + NONCE_EXPIRATION_MINUTES * 60 * 1000);

  // Clean up any old unused nonces for this address
  await prisma.authNonce.deleteMany({
    where: {
      address,
      usedAt: null,
    },
  });

  const record = await prisma.authNonce.create({
    data: {
      address,
      nonce,
      expiresAt,
    },
  });

  return {
    address: record.address,
    nonce: record.nonce,
    expiresAt: record.expiresAt,
  };
}

/**
 * Validates that a nonce exists, belongs to the address, is not expired,
 * and has not been used before. Consumes the nonce by setting `usedAt = now()`.
 */
export async function validateAndConsumeNonce(
  walletAddress: string,
  nonce: string
): Promise<{ valid: boolean; reason?: string }> {
  const address = normalizeAddress(walletAddress);

  const record = await prisma.authNonce.findUnique({
    where: { nonce },
  });

  if (!record) {
    return { valid: false, reason: "NONCE_NOT_FOUND" };
  }

  if (record.address !== address) {
    return { valid: false, reason: "NONCE_ADDRESS_MISMATCH" };
  }

  if (record.usedAt !== null) {
    return { valid: false, reason: "NONCE_ALREADY_USED" };
  }

  if (record.expiresAt.getTime() < Date.now()) {
    return { valid: false, reason: "NONCE_EXPIRED" };
  }

  // Consume the nonce (single-use constraint)
  await prisma.authNonce.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return { valid: true };
}
