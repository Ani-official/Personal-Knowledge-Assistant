import { vi } from "vitest"

function b64url(value: object) {
  return btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

/** An unsigned JWT-shaped token; the client only ever reads its claims. */
export function makeToken(claims: { sub?: string; exp?: number; iat?: number; auth_time?: number } = {}) {
  const now = Math.floor(Date.now() / 1000)
  const body = { sub: "user@example.com", iat: now, auth_time: now, exp: now + 7 * 24 * 3600, ...claims }
  return `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url(body)}.signature`
}

export function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  })
}

export function apiError(status: number, code: string, message = "server message", requestId = "req-1") {
  return jsonResponse(status, { error: { code, message, status, request_id: requestId }, detail: message }, {
    "X-Request-ID": requestId,
  })
}

export function mockFetch(...responses: (Response | Error | (() => Response | Promise<Response>))[]) {
  const fn = vi.fn(async () => {
    const next = responses.length > 1 ? responses.shift()! : responses[0]
    if (next instanceof Error) throw next
    return typeof next === "function" ? next() : next.clone()
  })
  vi.stubGlobal("fetch", fn)
  return fn
}
