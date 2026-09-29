/**
 * Browser-side session state.
 *
 * Policy (enforced by the API, mirrored here for UX):
 *  - A token is valid for 7 days after it was issued.
 *  - While the app is open, the token is refreshed at most once an hour, so an
 *    active user keeps rolling that 7-day window forward.
 *  - A session can never outlive 30 days from the original sign-in.
 * So: 7 days without opening the app, or 30 days after signing in, means
 * signing in again.
 */
import { ApiError, ERROR_CODES, parseApiError, toApiError } from "@/lib/api-errors"

export const TOKEN_KEY = "token"
export const AUTH_TYPE_KEY = "auth_type"
/** sessionStorage key: where to land after the round trip through Google. */
export const POST_LOGIN_NEXT_KEY = "post_login_next"
export const IDLE_TIMEOUT_DAYS = 7
export const MAX_SESSION_DAYS = 30
/** Refresh once the current token is older than this. */
export const REFRESH_AFTER_MS = 60 * 60 * 1000
/** Treat a token as expired slightly early so a request never races the deadline. */
const EXPIRY_SKEW_MS = 30 * 1000

export type AuthType = "email" | "google"

export type TokenClaims = {
  sub: string
  exp: number
  iat?: number
  auth_time?: number
}

const SESSION_SCOPED_KEYS = ["activeDocId", "activeConversationId"]

export function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage
  } catch {
    return null
  }
}

export function decodeToken(token: string | null | undefined): TokenClaims | null {
  if (!token) return null
  const parts = token.split(".")
  if (parts.length !== 3) return null
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4)
    const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
    const claims = JSON.parse(new TextDecoder().decode(bytes))
    if (typeof claims?.sub !== "string" || typeof claims?.exp !== "number") return null
    return claims as TokenClaims
  } catch {
    return null
  }
}

export function isExpired(claims: TokenClaims, now = Date.now()): boolean {
  return claims.exp * 1000 - EXPIRY_SKEW_MS <= now
}

export function needsRefresh(claims: TokenClaims, now = Date.now()): boolean {
  if (typeof claims.iat !== "number") return true
  return now - claims.iat * 1000 >= REFRESH_AFTER_MS
}

export function getToken(): string | null {
  const token = storage()?.getItem(TOKEN_KEY) ?? null
  // Older builds could store the literal string "undefined" after signup.
  return token && token !== "undefined" && token !== "null" ? token : null
}

export function getAuthType(): AuthType | null {
  const value = storage()?.getItem(AUTH_TYPE_KEY)
  return value === "email" || value === "google" ? value : null
}

export function setSession(token: string, authType: AuthType) {
  const store = storage()
  if (!store) return
  store.setItem(TOKEN_KEY, token)
  store.setItem(AUTH_TYPE_KEY, authType)
  sessionEnding = false
}

export function clearSession() {
  const store = storage()
  if (!store) return
  store.removeItem(TOKEN_KEY)
  store.removeItem(AUTH_TYPE_KEY)
  for (const key of SESSION_SCOPED_KEYS) store.removeItem(key)
}

export function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// --------------------------------------------------------------------------
// Ending a session
// --------------------------------------------------------------------------

let sessionEnding = false

/** Where to send the user once a session has ended. Overridable in tests. */
export const navigation = {
  go(url: string) {
    window.location.replace(url)
  },
}

/**
 * The session can no longer be used (expired, revoked, account gone). Clear it
 * and show the dedicated session-expired screen, which then hands off to login.
 * Safe to call from many places at once — only the first call navigates.
 */
export function endSession(reason: string = ERROR_CODES.AUTH_TOKEN_EXPIRED) {
  if (sessionEnding) return
  sessionEnding = true
  clearSession()
  if (typeof window === "undefined") return
  const next = window.location.pathname + window.location.search
  const params = new URLSearchParams({ reason })
  if (isSafeNext(next) && !next.startsWith("/auth/") && !next.startsWith("/login")) params.set("next", next)
  navigation.go(`/auth/session-expired?${params.toString()}`)
}

/** Only same-origin absolute paths are allowed as post-login destinations. */
export function isSafeNext(path: string | null | undefined): path is string {
  return !!path && path.startsWith("/") && !path.startsWith("//") && !path.includes("\\")
}

/**
 * Sign out everywhere. The local session is cleared first so signing out works
 * even offline; the API call (with the token captured beforehand) then revokes
 * every token for this account on the server.
 */
export async function signOut(): Promise<void> {
  const token = getToken()
  clearSession()
  if (!token) return
  try {
    await fetch(`${apiBase()}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
      keepalive: true,
    })
  } catch {
    // Offline: this device is signed out; other devices end at token expiry.
  }
}

// --------------------------------------------------------------------------
// Refresh
// --------------------------------------------------------------------------

export type RefreshResult =
  | { ok: true; token: string; email: string }
  | { ok: false; error: ApiError }

let inflight: Promise<RefreshResult> | null = null

/**
 * Exchange the current token for a fresh one. Concurrent callers share a
 * single request. Session-ending failures are returned, not acted on, so the
 * caller decides whether to show the expired screen.
 */
export function refreshSession(): Promise<RefreshResult> {
  if (inflight) return inflight
  const token = getToken()
  if (!token) {
    return Promise.resolve({ ok: false, error: new ApiError({ code: ERROR_CODES.AUTH_TOKEN_MISSING, status: 401 }) })
  }

  inflight = (async (): Promise<RefreshResult> => {
    try {
      const res = await fetch(`${apiBase()}/auth/refresh`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return { ok: false, error: await parseApiError(res) }
      const data = await res.json()
      if (typeof data?.access_token !== "string") {
        return { ok: false, error: new ApiError({ code: ERROR_CODES.INVALID_RESPONSE }) }
      }
      // Don't resurrect a session the user signed out of while we were waiting.
      if (getToken() === token) setSession(data.access_token, getAuthType() ?? "email")
      return { ok: true, token: data.access_token, email: data.email }
    } catch (err) {
      return { ok: false, error: toApiError(err) }
    } finally {
      inflight = null
    }
  })()
  return inflight
}

/** Test hook: forget module-level state between tests. */
export function __resetSessionStateForTests() {
  sessionEnding = false
  inflight = null
}
