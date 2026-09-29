/**
 * Client side of the API's structured errors (backend/app/core/errors.py).
 *
 * Every failure is normalised into an ApiError with a stable `code`, so UI
 * code branches on codes and shows copy from this file rather than whatever
 * English the server happened to send.
 */

export const ERROR_CODES = {
  AUTH_TOKEN_MISSING: "AUTH_TOKEN_MISSING",
  AUTH_TOKEN_INVALID: "AUTH_TOKEN_INVALID",
  AUTH_TOKEN_EXPIRED: "AUTH_TOKEN_EXPIRED",
  AUTH_USER_NOT_FOUND: "AUTH_USER_NOT_FOUND",
  AUTH_SESSION_REVOKED: "AUTH_SESSION_REVOKED",
  AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  AUTH_USE_GOOGLE_SIGNIN: "AUTH_USE_GOOGLE_SIGNIN",
  AUTH_EMAIL_TAKEN: "AUTH_EMAIL_TAKEN",
  AUTH_EMAIL_INVALID: "AUTH_EMAIL_INVALID",
  AUTH_PASSWORD_TOO_SHORT: "AUTH_PASSWORD_TOO_SHORT",
  AUTH_PASSWORD_TOO_LONG: "AUTH_PASSWORD_TOO_LONG",
  AUTH_PASSWORD_MISMATCH: "AUTH_PASSWORD_MISMATCH",
  AUTH_PASSWORD_REQUIRED: "AUTH_PASSWORD_REQUIRED",
  AUTH_OAUTH_CANCELLED: "AUTH_OAUTH_CANCELLED",
  AUTH_OAUTH_FAILED: "AUTH_OAUTH_FAILED",
  AUTH_OAUTH_EMAIL_MISSING: "AUTH_OAUTH_EMAIL_MISSING",
  AUTH_OAUTH_EMAIL_UNVERIFIED: "AUTH_OAUTH_EMAIL_UNVERIFIED",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  RATE_LIMITED: "RATE_LIMITED",
  NOT_FOUND: "NOT_FOUND",
  NETWORK_ERROR: "NETWORK_ERROR",
  INVALID_RESPONSE: "INVALID_RESPONSE",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  UPLOAD_FAILED: "UPLOAD_FAILED",
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

/** Codes meaning the stored session is unusable and the user must sign in again. */
export const SESSION_ENDED_CODES: ReadonlySet<string> = new Set([
  ERROR_CODES.AUTH_TOKEN_MISSING,
  ERROR_CODES.AUTH_TOKEN_INVALID,
  ERROR_CODES.AUTH_TOKEN_EXPIRED,
  ERROR_CODES.AUTH_USER_NOT_FOUND,
  ERROR_CODES.AUTH_SESSION_REVOKED,
])

/** Shown on the login screen to explain why the user is signing in again. */
export const LOGIN_NOTICES: Record<string, string> = {
  AUTH_TOKEN_EXPIRED: "Your session expired. Sign in again to pick up where you left off.",
  AUTH_TOKEN_INVALID: "Your session is no longer valid. Sign in again to continue.",
  AUTH_TOKEN_MISSING: "Sign in to continue.",
  AUTH_USER_NOT_FOUND: "The account you were using no longer exists. Sign in or create a new account.",
  AUTH_SESSION_REVOKED: "You were signed out. Sign in again to continue.",
}

type Copy = { title: string; message: string }

const COPY: Record<string, Copy> = {
  AUTH_TOKEN_MISSING: { title: "Sign in required", message: "Please sign in to continue." },
  AUTH_TOKEN_INVALID: {
    title: "Please sign in again",
    message: "Your session is no longer valid. Sign in again to continue.",
  },
  AUTH_TOKEN_EXPIRED: {
    title: "Session expired",
    message: "You were signed out after a period of inactivity. Sign in again to continue.",
  },
  AUTH_USER_NOT_FOUND: {
    title: "Account not found",
    message: "The account you were signed in with no longer exists.",
  },
  AUTH_SESSION_REVOKED: {
    title: "You were signed out",
    message: "This session was ended, for example by signing out on another device. Sign in again to continue.",
  },
  AUTH_INVALID_CREDENTIALS: {
    title: "Couldn't sign you in",
    message: "The email or password is incorrect. Check them and try again.",
  },
  AUTH_USE_GOOGLE_SIGNIN: {
    title: "Use Google to sign in",
    message: "This account was created with Google. Continue with Google to sign in.",
  },
  AUTH_EMAIL_TAKEN: {
    title: "Email already registered",
    message: "An account with this email already exists. Sign in instead.",
  },
  AUTH_EMAIL_INVALID: { title: "Check your email", message: "Enter a valid email address." },
  AUTH_PASSWORD_TOO_SHORT: {
    title: "Password too short",
    message: "Your password must be at least 8 characters.",
  },
  AUTH_PASSWORD_TOO_LONG: {
    title: "Password too long",
    message: "Your password must be at most 72 bytes. Try a shorter one.",
  },
  AUTH_PASSWORD_MISMATCH: {
    title: "Passwords don't match",
    message: "The two passwords you entered are different. Re-enter them to continue.",
  },
  AUTH_PASSWORD_REQUIRED: { title: "Enter your password", message: "Enter your password to sign in." },
  AUTH_OAUTH_CANCELLED: {
    title: "Google sign-in cancelled",
    message: "You cancelled signing in with Google. You can try again at any time.",
  },
  AUTH_OAUTH_FAILED: {
    title: "Google sign-in failed",
    message: "We couldn't complete signing in with Google. Please try again.",
  },
  AUTH_OAUTH_EMAIL_MISSING: {
    title: "Google didn't share your email",
    message: "We need your email address to sign you in. Try again and allow access to your email.",
  },
  AUTH_OAUTH_EMAIL_UNVERIFIED: {
    title: "Email not verified",
    message: "Your Google account's email isn't verified. Verify it with Google, then try again.",
  },
  VALIDATION_FAILED: { title: "Check your details", message: "Some fields are missing or invalid." },
  RATE_LIMITED: {
    title: "Too many attempts",
    message: "You've tried too many times. Wait a minute, then try again.",
  },
  NOT_FOUND: { title: "Not found", message: "What you were looking for doesn't exist anymore." },
  NETWORK_ERROR: {
    title: "Can't reach the server",
    message: "Check your internet connection and try again.",
  },
  INVALID_RESPONSE: {
    title: "Unexpected response",
    message: "The server sent a response we couldn't read. Please try again.",
  },
  SERVICE_UNAVAILABLE: {
    title: "Service unavailable",
    message: "The service is temporarily unavailable. Please try again shortly.",
  },
  INTERNAL_ERROR: {
    title: "Something went wrong",
    message: "Something went wrong on our side. Please try again.",
  },
  UPLOAD_FAILED: { title: "Upload failed", message: "Your file couldn't be uploaded. Please try again." },
}

const FALLBACK: Copy = { title: "Something went wrong", message: "Please try again." }

export function copyFor(code: string): Copy {
  return COPY[code] ?? FALLBACK
}

export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly title: string
  readonly requestId?: string
  readonly fields?: { field: string; message: string }[]

  constructor(opts: {
    code: string
    status?: number
    message?: string
    title?: string
    requestId?: string
    fields?: { field: string; message: string }[]
  }) {
    const copy = copyFor(opts.code)
    super(opts.message ?? copy.message)
    this.name = "ApiError"
    this.code = opts.code
    this.status = opts.status ?? 0
    this.title = opts.title ?? copy.title
    this.requestId = opts.requestId
    this.fields = opts.fields
  }

  get isSessionEnded() {
    return SESSION_ENDED_CODES.has(this.code)
  }
}

function codeForStatus(status: number): string {
  if (status === 404) return ERROR_CODES.NOT_FOUND
  if (status === 422) return ERROR_CODES.VALIDATION_FAILED
  if (status === 429) return ERROR_CODES.RATE_LIMITED
  if (status === 502 || status === 503 || status === 504) return ERROR_CODES.SERVICE_UNAVAILABLE
  return ERROR_CODES.INTERNAL_ERROR
}

/**
 * Auth and infrastructure failures always use our copy. Other codes (NOT_FOUND,
 * BAD_REQUEST…) keep the route's own message, which says what actually failed.
 */
const OWN_COPY_CODES: ReadonlySet<string> = new Set([
  ERROR_CODES.RATE_LIMITED,
  ERROR_CODES.INTERNAL_ERROR,
  ERROR_CODES.SERVICE_UNAVAILABLE,
])

function prefersOwnCopy(code: string): boolean {
  return code in COPY && (code.startsWith("AUTH_") || OWN_COPY_CODES.has(code))
}

/**
 * Turn a failed Response into an ApiError. Known codes use our own copy;
 * unknown codes keep the server's message so nothing useful is lost.
 */
export async function parseApiError(res: Response): Promise<ApiError> {
  const requestId = res.headers.get("X-Request-ID") ?? undefined
  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    // Not JSON — typically a proxy/HTML error page.
  }

  const err = (body as { error?: Record<string, unknown> } | null)?.error
  if (err && typeof err.code === "string") {
    const fields = Array.isArray(err.fields) ? (err.fields as { field: string; message: string }[]) : undefined
    return new ApiError({
      code: err.code,
      status: res.status,
      message: prefersOwnCopy(err.code) ? undefined : typeof err.message === "string" ? err.message : undefined,
      requestId: (typeof err.request_id === "string" ? err.request_id : undefined) ?? requestId,
      fields,
    })
  }

  // Legacy { detail } bodies from routes that predate structured errors.
  const detail = (body as { detail?: unknown } | null)?.detail
  return new ApiError({
    code: codeForStatus(res.status),
    status: res.status,
    message: typeof detail === "string" ? detail : undefined,
    requestId,
  })
}

/** Normalise anything thrown during a request into an ApiError. */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err
  if (err instanceof TypeError) return new ApiError({ code: ERROR_CODES.NETWORK_ERROR })
  if (err instanceof SyntaxError) return new ApiError({ code: ERROR_CODES.INVALID_RESPONSE })
  return new ApiError({ code: ERROR_CODES.INTERNAL_ERROR })
}
