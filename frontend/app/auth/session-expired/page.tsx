"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Clock, ShieldAlert, UserX } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ERROR_CODES, SESSION_ENDED_CODES } from "@/lib/api-errors"
import { IDLE_TIMEOUT_DAYS, MAX_SESSION_DAYS, isSafeNext, navigation } from "@/lib/session"

const REDIRECT_SECONDS = 10

const SCREENS: Record<string, { icon: typeof Clock; title: string; body: string }> = {
  [ERROR_CODES.AUTH_TOKEN_EXPIRED]: {
    icon: Clock,
    title: "Your session has expired",
    body: `For your security, we sign you out after ${IDLE_TIMEOUT_DAYS} days without activity, and ${MAX_SESSION_DAYS} days after you last signed in. Your documents and conversations are safe.`,
  },
  [ERROR_CODES.AUTH_TOKEN_INVALID]: {
    icon: ShieldAlert,
    title: "Please sign in again",
    body: "Your session is no longer valid. This can happen after a security update. Your documents and conversations are safe.",
  },
  [ERROR_CODES.AUTH_TOKEN_MISSING]: {
    icon: ShieldAlert,
    title: "Please sign in again",
    body: "You've been signed out. Sign in again to continue.",
  },
  [ERROR_CODES.AUTH_USER_NOT_FOUND]: {
    icon: UserX,
    title: "Account not found",
    body: "The account you were signed in with no longer exists. Sign in with another account, or create a new one.",
  },
}

function SessionExpiredScreen() {
  const params = useSearchParams()
  const rawReason = params.get("reason") ?? ""
  const reason = SESSION_ENDED_CODES.has(rawReason) ? rawReason : ERROR_CODES.AUTH_TOKEN_EXPIRED
  const nextParam = params.get("next")

  const loginParams = new URLSearchParams({ reason })
  if (isSafeNext(nextParam)) loginParams.set("next", nextParam)
  const loginUrl = `/login?${loginParams.toString()}`

  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS)

  useEffect(() => {
    if (secondsLeft <= 0) {
      navigation.go(loginUrl)
      return
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft, loginUrl])

  const screen = SCREENS[reason]
  const Icon = screen.icon

  return (
    <main className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
      <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-primary/10">
        <Icon className="size-7 text-primary" aria-hidden />
      </div>
      <h1 className="mb-3 text-2xl font-semibold">{screen.title}</h1>
      <p className="mb-6 leading-relaxed text-muted-foreground">{screen.body}</p>

      <Button className="h-11 w-full" onClick={() => navigation.go(loginUrl)}>
        Sign in again
      </Button>
      <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
        Taking you to sign in in {secondsLeft} second{secondsLeft === 1 ? "" : "s"}…
      </p>
      <Link href="/" className="mt-4 inline-block text-sm text-primary hover:underline">
        Go to the home page
      </Link>
      <p className="mt-6 text-xs text-muted-foreground">
        Reference: <code className="font-mono">{reason}</code>
      </p>
    </main>
  )
}

export default function SessionExpiredPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Suspense fallback={null}>
        <SessionExpiredScreen />
      </Suspense>
    </div>
  )
}
