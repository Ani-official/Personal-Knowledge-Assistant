"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function GoogleCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const fetchToken = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get("code")
      const state = params.get("state")

      if (!code) {
        alert("No code in Google callback")
        return router.push("/")
      }

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/google/callback?code=${code}&state=${state}`, {
          credentials: "include", // if backend sets cookies
        })

        const data = await res.json()
        if (res.ok) {
          localStorage.setItem("token", data.access_token)
          router.push("/dashboard")
        } else {
          alert(data.detail || "Google login failed")
          router.push("/")
        }
      } catch (err) {
        alert("Google login error")
        router.push("/")
      }
    }

    fetchToken()
  }, [router])

  return <div className="p-6 text-center">Logging you in with Google...</div>
}
