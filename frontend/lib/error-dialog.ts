import { useSyncExternalStore } from "react"

import { ApiError, copyFor, toApiError } from "@/lib/api-errors"

export type ErrorDialogAction = { label: string; onSelect: () => void }

export type ErrorDialogState = {
  id: number
  title: string
  message: string
  code?: string
  requestId?: string
  action?: ErrorDialogAction
}

type Listener = () => void

let current: ErrorDialogState | null = null
let nextId = 1
const listeners = new Set<Listener>()

function emit() {
  for (const listener of listeners) listener()
}

/**
 * Show an error in the app-wide dialog (the replacement for window.alert).
 * Accepts an ApiError / thrown value, or explicit copy.
 */
export function showErrorDialog(
  input:
    | unknown
    | { title?: string; message?: string; code?: string; requestId?: string; action?: ErrorDialogAction },
  action?: ErrorDialogAction
) {
  let state: Omit<ErrorDialogState, "id">
  if (input instanceof ApiError || input instanceof Error || !isPlainCopy(input)) {
    const err = toApiError(input)
    state = { title: err.title, message: err.message, code: err.code, requestId: err.requestId, action }
  } else {
    const copy = input.code ? copyFor(input.code) : null
    state = {
      title: input.title ?? copy?.title ?? "Something went wrong",
      message: input.message ?? copy?.message ?? "Please try again.",
      code: input.code,
      requestId: input.requestId,
      action: input.action ?? action,
    }
  }
  current = { ...state, id: nextId++ }
  emit()
}

function isPlainCopy(
  value: unknown
): value is { title?: string; message?: string; code?: string; requestId?: string; action?: ErrorDialogAction } {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.getPrototypeOf(value) === Object.prototype &&
    ("title" in value || "message" in value || "code" in value)
  )
}

/**
 * Report a failed operation. Session-ending errors are skipped: apiFetch has
 * already routed the user to the session-expired screen.
 */
export function reportError(err: unknown, fallback?: { title: string; message: string }) {
  const apiError = toApiError(err)
  if (apiError.isSessionEnded) return
  // Plain JS errors carry no user-facing copy; prefer the caller's wording.
  if (!(err instanceof ApiError) && fallback) {
    showErrorDialog(fallback)
    return
  }
  showErrorDialog(apiError)
}

export function dismissErrorDialog() {
  if (!current) return
  current = null
  emit()
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useErrorDialogState(): ErrorDialogState | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null
  )
}
