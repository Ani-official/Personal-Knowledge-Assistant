import { describe, expect, it, vi } from "vitest"

import {
  REFRESH_AFTER_MS,
  clearSession,
  decodeToken,
  endSession,
  getToken,
  isExpired,
  isSafeNext,
  navigation,
  needsRefresh,
  refreshSession,
  setSession,
  signOut,
} from "@/lib/session"
import { apiError, jsonResponse, makeToken, mockFetch } from "./helpers"

const now = () => Math.floor(Date.now() / 1000)
const segment = (value: object) => btoa(JSON.stringify(value))

describe("decodeToken", () => {
  it("reads claims from a JWT", () => {
    const token = makeToken({ sub: "a@b.co", exp: 2_000_000_000 })
    expect(decodeToken(token)).toMatchObject({ sub: "a@b.co", exp: 2_000_000_000 })
  })

  it("handles base64url characters", () => {
    // Characters whose base64 encoding contains '+' / '/', i.e. '-' / '_' in base64url.
    const token = makeToken({ sub: ">>>???@example.com" })
    expect(decodeToken(token)?.sub).toBe(">>>???@example.com")
  })

  it.each([
    ["null", null],
    ["empty", ""],
    ["two segments", "a.b"],
    ["non-JSON payload", "a.!!!.c"],
    ["the string undefined", "undefined"],
  ])("returns null for %s", (_label, token) => {
    expect(decodeToken(token as string | null)).toBeNull()
  })

  it("rejects tokens missing sub or exp", () => {
    expect(decodeToken(`${segment({})}.${segment({ sub: "x" })}.s`)).toBeNull()
    expect(decodeToken(`${segment({})}.${segment({ exp: 1 })}.s`)).toBeNull()
  })
})

describe("expiry and refresh timing", () => {
  it("treats a token as expired 30s early", () => {
    expect(isExpired({ sub: "x", exp: now() + 20 })).toBe(true)
    expect(isExpired({ sub: "x", exp: now() + 120 })).toBe(false)
    expect(isExpired({ sub: "x", exp: now() - 1 })).toBe(true)
  })

  it("refreshes only once the token is an hour old", () => {
    expect(needsRefresh({ sub: "x", exp: now() + 999, iat: now() - 60 })).toBe(false)
    expect(needsRefresh({ sub: "x", exp: now() + 999, iat: now() - REFRESH_AFTER_MS / 1000 - 1 })).toBe(true)
  })

  it("refreshes legacy tokens with no iat", () => {
    expect(needsRefresh({ sub: "x", exp: now() + 999 })).toBe(true)
  })
})

describe("storage", () => {
  it("round-trips a session", () => {
    setSession("tok", "google")
    expect(getToken()).toBe("tok")
    expect(localStorage.getItem("auth_type")).toBe("google")
  })

  it("ignores the literal strings 'undefined' and 'null' left by the old signup bug", () => {
    localStorage.setItem("token", "undefined")
    expect(getToken()).toBeNull()
    localStorage.setItem("token", "null")
    expect(getToken()).toBeNull()
  })

  it("clearSession removes session-scoped keys but keeps preferences", () => {
    setSession("tok", "email")
    localStorage.setItem("activeDocId", "d1")
    localStorage.setItem("activeConversationId", "c1")
    localStorage.setItem("selected-model", "m")
    clearSession()
    expect(getToken()).toBeNull()
    expect(localStorage.getItem("activeDocId")).toBeNull()
    expect(localStorage.getItem("activeConversationId")).toBeNull()
    expect(localStorage.getItem("selected-model")).toBe("m")
  })
})

describe("isSafeNext", () => {
  it.each(["/dashboard", "/dashboard?x=1", "/a/b"])("allows %s", (path) => {
    expect(isSafeNext(path)).toBe(true)
  })

  it.each(["", null, "dashboard", "//evil.com", "https://evil.com", "/\\evil.com", "javascript:alert(1)"])(
    "rejects %s",
    (path) => {
      expect(isSafeNext(path as string | null)).toBe(false)
    }
  )
})

describe("endSession", () => {
  it("clears the session and shows the session-expired screen with reason and return path", () => {
    const go = vi.spyOn(navigation, "go").mockImplementation(() => {})
    window.history.replaceState(null, "", "/dashboard?doc=1")
    setSession("tok", "email")

    endSession("AUTH_TOKEN_EXPIRED")

    expect(getToken()).toBeNull()
    expect(go).toHaveBeenCalledTimes(1)
    const url = new URL(go.mock.calls[0][0], "http://x")
    expect(url.pathname).toBe("/auth/session-expired")
    expect(url.searchParams.get("reason")).toBe("AUTH_TOKEN_EXPIRED")
    expect(url.searchParams.get("next")).toBe("/dashboard?doc=1")
  })

  it("navigates only once when many requests fail together", () => {
    const go = vi.spyOn(navigation, "go").mockImplementation(() => {})
    endSession("AUTH_TOKEN_EXPIRED")
    endSession("AUTH_TOKEN_INVALID")
    endSession("AUTH_TOKEN_EXPIRED")
    expect(go).toHaveBeenCalledTimes(1)
  })

  it("does not use auth pages as the return path", () => {
    const go = vi.spyOn(navigation, "go").mockImplementation(() => {})
    window.history.replaceState(null, "", "/login?next=/dashboard")
    endSession("AUTH_TOKEN_EXPIRED")
    expect(new URL(go.mock.calls[0][0], "http://x").searchParams.get("next")).toBeNull()
  })

  it("re-arms after a new sign-in", () => {
    const go = vi.spyOn(navigation, "go").mockImplementation(() => {})
    endSession("AUTH_TOKEN_EXPIRED")
    setSession("new", "email")
    endSession("AUTH_TOKEN_EXPIRED")
    expect(go).toHaveBeenCalledTimes(2)
  })
})

describe("refreshSession", () => {
  it("stores the rotated token", async () => {
    const fresh = makeToken({ sub: "u@example.com" })
    setSession("old", "google")
    const fetch = mockFetch(jsonResponse(200, { access_token: fresh, email: "u@example.com" }))

    const result = await refreshSession()

    expect(result).toEqual({ ok: true, token: fresh, email: "u@example.com" })
    expect(getToken()).toBe(fresh)
    expect(localStorage.getItem("auth_type")).toBe("google")
    expect(fetch).toHaveBeenCalledWith(
      "http://api.test/auth/refresh",
      expect.objectContaining({ method: "POST", headers: { Authorization: "Bearer old" } })
    )
  })

  it("shares one request between concurrent callers", async () => {
    setSession("old", "email")
    const fetch = mockFetch(jsonResponse(200, { access_token: makeToken(), email: "u@example.com" }))
    const [a, b] = await Promise.all([refreshSession(), refreshSession()])
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(a).toEqual(b)
  })

  it("returns session-ending errors without acting on them", async () => {
    setSession("old", "email")
    mockFetch(apiError(401, "AUTH_TOKEN_EXPIRED"))
    const result = await refreshSession()
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("AUTH_TOKEN_EXPIRED")
      expect(result.error.isSessionEnded).toBe(true)
    }
    expect(getToken()).toBe("old")
  })

  it("reports network failures as NETWORK_ERROR", async () => {
    setSession("old", "email")
    mockFetch(new TypeError("Failed to fetch"))
    const result = await refreshSession()
    expect(!result.ok && result.error.code).toBe("NETWORK_ERROR")
    expect(getToken()).toBe("old")
  })

  it("does not resurrect a session the user signed out of mid-request", async () => {
    setSession("old", "email")
    mockFetch(() => {
      clearSession()
      return jsonResponse(200, { access_token: makeToken(), email: "u@example.com" })
    })
    await refreshSession()
    expect(getToken()).toBeNull()
  })

  it("fails fast with AUTH_TOKEN_MISSING when signed out", async () => {
    const fetch = mockFetch(jsonResponse(200, {}))
    const result = await refreshSession()
    expect(!result.ok && result.error.code).toBe("AUTH_TOKEN_MISSING")
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe("signOut", () => {
  it("revokes the session on the server using the token it just cleared", async () => {
    const token = makeToken()
    setSession(token, "email")
    localStorage.setItem("activeDocId", "d1")
    const fetch = mockFetch(new Response(null, { status: 204 }))

    await signOut()

    expect(getToken()).toBeNull()
    expect(localStorage.getItem("activeDocId")).toBeNull()
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe("http://api.test/auth/logout")
    expect(init.method).toBe("POST")
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${token}`)
  })

  it("signs this device out even when the API is unreachable", async () => {
    setSession(makeToken(), "email")
    mockFetch(new TypeError("Failed to fetch"))
    await expect(signOut()).resolves.toBeUndefined()
    expect(getToken()).toBeNull()
  })

  it("does not call the API when already signed out", async () => {
    const fetch = mockFetch(new Response(null, { status: 204 }))
    await signOut()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("clears the session before the request returns", async () => {
    setSession(makeToken(), "email")
    let tokenDuringRequest: string | null = "unset"
    mockFetch(() => {
      tokenDuringRequest = getToken()
      return new Response(null, { status: 204 })
    })
    await signOut()
    expect(tokenDuringRequest).toBeNull()
  })
})
