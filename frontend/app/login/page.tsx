"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import AuthDialog from "@/components/ui/auth-dialog"
import { LOGIN_NOTICES } from "@/lib/api-errors"
import { isSafeNext } from "@/lib/session"
import { useAuth } from "@/lib/useAuth"

function LoginScreen() {
  const router = useRouter()
  const params = useSearchParams()
  const { status } = useAuth()

  const nextParam = params.get("next")
  const next = isSafeNext(nextParam) ? nextParam : "/dashboard"
  const reason = params.get("reason")
  const notice = reason ? LOGIN_NOTICES[reason] : undefined

  // Already signed in (e.g. in another tab) — nothing to do here.
  useEffect(() => {
    if (status === "authenticated") router.replace(next)
  }, [status, next, router])

  if (status !== "unauthenticated") return null

  return (
    <AuthDialog
      mode={params.get("mode") === "signup" ? "signup" : "signin"}
      openByDefault
      hideTrigger
      notice={notice}
      redirectTo={next}
      onDismiss={() => router.push("/")}
    />
  )
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Suspense fallback={null}>
        <LoginScreen />
      </Suspense>
    </div>
  )
}
