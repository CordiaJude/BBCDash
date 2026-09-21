import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import type { SessionUser } from "./types";

const COOKIE_NAME = "dab_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days — shared kiosk-style devices

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Missing SESSION_SECRET env var");
  return new TextEncoder().encode(secret);
}

// Shared by the httpOnly session cookie and the bearer token handed to the
// Chrome extension (which can't rely on the cookie — it's SameSite=lax and
// a chrome-extension:// origin is cross-site, so the browser won't attach
// it to the extension's fetches). Same signature, same claims either way.
export async function signSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function createSessionCookie(user: SessionUser) {
  const token = await signSessionToken(user);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      id: payload.id as string,
      email: payload.email as string,
      display_name: payload.display_name as string,
      role: payload.role as SessionUser["role"],
      color_hex: payload.color_hex as string,
    };
  } catch {
    return null;
  }
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      id: payload.id as string,
      email: payload.email as string,
      display_name: payload.display_name as string,
      role: payload.role as SessionUser["role"],
      color_hex: payload.color_hex as string,
    };
  } catch {
    return null;
  }
}

// Used by API routes the Chrome extension calls: checks the extension's
// Authorization: Bearer <token> header first, falls back to the normal
// session cookie so the same route still works from the web app.
export async function getSessionFromRequest(req: NextRequest): Promise<SessionUser | null> {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return verifySessionToken(auth.slice("Bearer ".length));
  }
  return getSession();
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
