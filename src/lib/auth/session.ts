import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const COOKIE_NAME = 'finance_auth_token';
const DEFAULT_SECRET = 'antigravity-finance-secret-key-32-chars-min!';

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || DEFAULT_SECRET;
  return new TextEncoder().encode(secret);
}

/**
 * Genera un token JWT firmado de sesión con validez de 30 días.
 */
export async function createSessionToken(): Promise<string> {
  const secretKey = getSecretKey();
  return await new SignJWT({ user: 'owner' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secretKey);
}

/**
 * Valida un token JWT.
 */
export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const secretKey = getSecretKey();
    await jwtVerify(token, secretKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Verifica si la petición actual posee una cookie de sesión válida.
 */
export async function isRequestAuthenticated(req?: NextRequest): Promise<boolean> {
  let token: string | undefined;

  if (req) {
    token = req.cookies.get(COOKIE_NAME)?.value;
  } else {
    try {
      const cookieStore = cookies();
      token = cookieStore.get(COOKIE_NAME)?.value;
    } catch {
      return false;
    }
  }

  if (!token) return false;
  return await verifySessionToken(token);
}

export { COOKIE_NAME };
