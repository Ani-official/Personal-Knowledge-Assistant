"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { ERROR_CODES } from "@/lib/api-errors"
import { showErrorDialog } from "@/lib/error-dialog"
import { POST_LOGIN_NEXT_KEY, apiBase, decodeToken, isExpired, isSafeNext, setSession } from "@/lib/session"

function takePostLoginNext(): string {
  try {
    const next = sessionStorage.getItem(POST_LOGIN_NEXT_KEY)
    sessionStorage.removeItem(POST_LOGIN_NEXT_KEY)
    return isSafeNext(next) ? next : "/dashboard"
  } catch {
    return "/dashboard"
  }
}

export default function GoogleCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    // The API redirects here with #token=<jwt>&auth_type=google (or #error=<code>).
    // The query string is still read so a backend on the previous release keeps working.
    const fromHash = new URLSearchParams(window.location.hash.slice(1))
    const fromQuery = new URLSearchParams(window.location.search)
    const read = (key: string) => fromHash.get(key) ?? fromQuery.get(key)

    const token = read("token")
    const error = read("error")

    // Don't leave the token sitting in the address bar or browser history.
    window.history.replaceState(null, "", window.location.pathname)

    const claims = decodeToken(token)
    if (token && claims && !isExpired(claims)) {
      setSession(token, "google")
      router.replace(takePostLoginNext())
      return
    }

    // No usable token (missing, malformed or already expired) without a reason is a failed sign-in.
    const code = error ?? ERROR_CODES.AUTH_OAUTH_FAILED
    showErrorDialog(
      { code },
      code === ERROR_CODES.AUTH_OAUTH_EMAIL_UNVERIFIED
        ? undefined
        : {
            label: "Try Google again",
            onSelect: () => {
              window.location.href = `${apiBase()}/auth/login/google`
            },
          }
    )
    router.replace("/login")
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center text-muted-foreground">
      Signing you in with Google…
    </div>
  )
}
