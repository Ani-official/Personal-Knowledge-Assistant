"use client"

import { useEffect, useState } from "react"

export function useAuth() {
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading")
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const localToken = localStorage.getItem("token")
    const authType = localStorage.getItem("auth_type")

    // 1. If token exists (email/password login)
    if (localToken && authType === "email") {
      setStatus("authenticated")
      return
    }

    // 2. Otherwise check server (OAuth via cookie)
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
      credentials: "include", // important!
    })
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data) => {
        if (data?.email) {
          setEmail(data.email)
          setStatus("authenticated")
          localStorage.setItem("auth_type", "google")
        } else {
          setStatus("unauthenticated")
        }
      })
      .catch(() => {
        setStatus("unauthenticated")
      })
  }, [])

  return { status, email }
}
