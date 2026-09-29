import { ApiError, parseApiError, toApiError } from "@/lib/api-errors"
import { apiBase, authHeaders, endSession, getToken } from "@/lib/session"

/**
 * fetch() for our API: attaches the session token, and turns any failure into
 * an ApiError. A 401 that means the session is over (expired, invalid,
 * account deleted) ends the session and routes to the session-expired screen,
 * so no caller has to handle that case on its own.
 *
 * Resolves with the Response only when `res.ok`; otherwise rejects.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const hadToken = getToken() !== null
  const headers = new Headers(init.headers)
  for (const [key, value] of Object.entries(authHeaders())) {
    if (!headers.has(key)) headers.set(key, value)
  }

  let res: Response
  try {
    res = await fetch(`${apiBase()}${path}`, { ...init, headers })
  } catch (err) {
    throw toApiError(err)
  }

  if (res.ok) return res

  const error = await parseApiError(res)
  if (res.status === 401 && error.isSessionEnded && hadToken) {
    endSession(error.code)
  }
  throw error
}

/** apiFetch + JSON body. */
export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, init)
  try {
    return (await res.json()) as T
  } catch (err) {
    throw toApiError(err)
  }
}

export { ApiError }
