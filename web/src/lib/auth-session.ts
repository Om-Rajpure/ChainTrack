import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "chaintrack-default-dev-secret-32-chars-long!!";
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);
export const SESSION_COOKIE_NAME = "chaintrack_session";

export interface SessionPayload {
  address: string;
  role: string;
  active: boolean;
  exp?: number;
}

/**
 * Issue a signed JWT token valid for 12 hours.
 */
export async function createSessionToken(payload: { address: string; role: string; active: boolean }): Promise<string> {
  return new SignJWT({
    address: payload.address.toLowerCase(),
    role: payload.role,
    active: payload.active,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(SECRET_KEY);
}

/**
 * Verify a JWT session token and return its payload.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return {
      address: (payload.address as string).toLowerCase(),
      role: payload.role as string,
      active: Boolean(payload.active),
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

/**
 * Get current session from cookie header in server components / route handlers.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
