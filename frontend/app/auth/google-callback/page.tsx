"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function GoogleCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    // The backend redirects here with ?token=<jwt>&auth_type=google after OAuth.
    // We store them in localStorage to match the email/password flow.
    const params = new URLSearchParams(window.location.search)
    const token = params.get("token")
    const authType = params.get("auth_type")

    if (token) {
      localStorage.setItem("token", token)
      if (authType) localStorage.setItem("auth_type", authType)
      router.replace("/dashboard")
    } else {
      alert("Google login failed — no token received")
      router.replace("/")
    }
  }, [router])

  return <div className="p-6 text-center">Logging you in with Google...</div>
}
