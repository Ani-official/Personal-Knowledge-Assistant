"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { ERROR_CODES } from "@/lib/api-errors"
import {
  TOKEN_KEY,
  clearSession,
  decodeToken,
  endSession,
  getToken,
  isExpired,
  navigation,
  needsRefresh,
  refreshSession,
} from "@/lib/session"

export type AuthStatus = "loading" | "authenticated" | "unauthenticated"

// setTimeout overflows past ~24.8 days; tokens never live that long, but clamp anyway.
const MAX_TIMER_MS = 2 ** 31 - 1

/**
 * Current session state.
 *
 * `required: true` is for protected pages: a returning user whose session has
 * ended is sent to the session-expired screen (then login), and a visitor who
 * never signed in goes straight to /login. Without it, an ended session is
 * cleared quietly and the page renders signed-out (e.g. the landing page).
 */
export function useAuth({ required = false }: { required?: boolean } = {}) {
  const [status, setStatus] = useState<AuthStatus>("loading")
  const [email, setEmail] = useState<string | null>(null)
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sessionOver = useCallback(
    (reason: string) => {
      if (expiryTimer.current) clearTimeout(expiryTimer.current)
      setEmail(null)
      if (required) {
        endSession(reason)
      } else {
        clearSession()
        setStatus("unauthenticated")
      }
    },
    [required]
  )

  // Re-evaluate just after the token's local expiry, so a tab left open ends
  // the session on time instead of on the next failed request.
  const scheduleRecheck = (exp: number) => {
    if (expiryTimer.current) clearTimeout(expiryTimer.current)
    const delay = Math.max(exp * 1000 - Date.now() - 30_000, 0) + 1_000
    expiryTimer.current = setTimeout(() => void evaluateRef.current(), Math.min(delay, MAX_TIMER_MS))
  }

  const evaluate = useCallback(async () => {
    const token = getToken()
    const claims = decodeToken(token)

    if (!token) {
      setEmail(null)
      setStatus("unauthenticated")
      if (required) {
        const next = window.location.pathname + window.location.search
        navigation.go(`/login?next=${encodeURIComponent(next)}`)
      }
      return
    }

    if (!claims) {
      sessionOver(ERROR_CODES.AUTH_TOKEN_INVALID)
      return
    }

    if (isExpired(claims)) {
      sessionOver(ERROR_CODES.AUTH_TOKEN_EXPIRED)
      return
    }

    setEmail(claims.sub)
    setStatus("authenticated")
    scheduleRecheck(claims.exp)

    if (!needsRefresh(claims)) return

    const result = await refreshSession()
    if (result.ok) {
      setEmail(result.email ?? claims.sub)
      const fresh = decodeToken(result.token)
      if (fresh) scheduleRecheck(fresh.exp)
    } else if (result.error.isSessionEnded) {
      sessionOver(result.error.code)
    }
    // Network / server errors: keep the session; the token is still valid
    // locally and requests will surface their own errors.
  }, [required, sessionOver])

  const evaluateRef = useRef(evaluate)
  evaluateRef.current = evaluate

  useEffect(() => {
    void evaluate()

    // Returning to a tab that sat in the background (or a laptop waking from
    // sleep) re-checks expiry and rolls the session forward.
    const onVisible = () => {
      if (document.visibilityState === "visible") void evaluate()
    }
    // Signing in or out in another tab updates this one.
    const onStorage = (event: StorageEvent) => {
      if (event.key === TOKEN_KEY || event.key === null) void evaluate()
    }

    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("focus", onVisible)
    window.addEventListener("storage", onStorage)
    return () => {
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("focus", onVisible)
      window.removeEventListener("storage", onStorage)
      if (expiryTimer.current) clearTimeout(expiryTimer.current)
    }
  }, [evaluate])

  return { status, email }
}
