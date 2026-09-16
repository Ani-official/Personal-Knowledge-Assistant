"use client"

import { useEffect, useState } from "react"

export function useAuth() {
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading")
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const localToken = localStorage.getItem("token")
    const authType = localStorage.getItem("auth_type")

    // If a token exists in localStorage (email/password OR google via callback page)
    if (localToken && (authType === "email" || authType === "google")) {
      setStatus("authenticated")

      // Best-effort: the profile menu shows the signed-in address, but a failed
      // lookup must not knock the user out of an otherwise valid session.
      let cancelled = false
      void (async () => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${localToken}` },
            credentials: "include",
          })
          if (!res.ok || cancelled) return
          const data = await res.json()
          setEmail(data?.email ?? null)
        } catch {
          // ignore — the menu falls back to a generic label
        }
      })()

      return () => {
        cancelled = true
      }
    }

    // No token — user is not logged in
    setStatus("unauthenticated")
  }, [])

  return { status, email }
}
