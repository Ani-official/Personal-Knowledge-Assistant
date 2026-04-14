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
      return
    }

    // No token — user is not logged in
    setStatus("unauthenticated")
  }, [])

  return { status, email }
}
