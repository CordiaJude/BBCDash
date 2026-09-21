// Shared by popup.js, background.js, quickadd.js, and options.js.
//
// Auth note: the site's session is an httpOnly, SameSite=lax cookie.
// SameSite=lax cookies are never attached to cross-site fetches, and a
// chrome-extension:// page is cross-site relative to the API's origin —
// so the extension can't ride the browser's normal cookie. Instead
// /api/auth/login also returns a signed bearer token in its JSON body
// (see src/app/api/auth/login/route.ts), which the extension stores
// itself and sends as `Authorization: Bearer <token>` on every request.
// The API routes the extension calls (getSessionFromRequest, in
// src/lib/auth.ts) accept either the cookie or that header.

export const DEFAULT_BASE_URL = "https://dealership-appointment-board.vercel.app";

export async function getBaseUrl() {
  const { baseUrl } = await chrome.storage.local.get("baseUrl");
  return baseUrl || DEFAULT_BASE_URL;
}

export async function getAuth() {
  const { token, user } = await chrome.storage.local.get(["token", "user"]);
  return { token: token || null, user: user || null };
}

export async function setAuth(token, user) {
  await chrome.storage.local.set({ token, user });
}

export async function clearAuth() {
  await chrome.storage.local.remove(["token", "user"]);
}

export async function login(email, password) {
  const baseUrl = await getBaseUrl();
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Login failed.");
  await setAuth(data.token, data.user);
  return data.user;
}

/** Fetch against the DriveBoard API with the stored bearer token attached. Clears stored auth on a 401 (expired/invalid token). */
export async function apiFetch(path, options = {}) {
  const baseUrl = await getBaseUrl();
  const { token } = await getAuth();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${path}`, { ...options, headers });
  if (res.status === 401) await clearAuth();
  return res;
}

export function formatTime12h(time) {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
