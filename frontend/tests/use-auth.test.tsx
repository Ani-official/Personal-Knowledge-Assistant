import { act, renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { REFRESH_AFTER_MS, getToken, navigation, setSession } from "@/lib/session"
import { useAuth } from "@/lib/useAuth"
import { apiError, jsonResponse, makeToken, mockFetch } from "./helpers"

const now = () => Math.floor(Date.now() / 1000)
const staleIat = () => now() - REFRESH_AFTER_MS / 1000 - 60

function spyNavigation() {
  return vi.spyOn(navigation, "go").mockImplementation(() => {})
}

describe("useAuth — first visit", () => {
  it("is unauthenticated with no token (public page)", async () => {
    const go = spyNavigation()
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.status).toBe("unauthenticated"))
    expect(go).not.toHaveBeenCalled()
  })

  it("sends a never-signed-in visitor straight to /login from a protected page", async () => {
    const go = spyNavigation()
    window.history.replaceState(null, "", "/dashboard")
    renderHook(() => useAuth({ required: true }))
    await waitFor(() => expect(go).toHaveBeenCalledWith("/login?next=%2Fdashboard"))
    // Not the session-expired screen: there was no session to expire.
    expect(go.mock.calls[0][0]).not.toContain("session-expired")
  })
})

describe("useAuth — returning user", () => {
  it("is authenticated immediately with a recent token and does not call the API", async () => {
    const fetch = mockFetch(jsonResponse(200, {}))
    setSession(makeToken({ sub: "me@example.com" }), "email")
    const { result } = renderHook(() => useAuth({ required: true }))
    await waitFor(() => expect(result.current.status).toBe("authenticated"))
    expect(result.current.email).toBe("me@example.com")
    expect(fetch).not.toHaveBeenCalled()
  })

  it("rolls the session forward when the token is over an hour old", async () => {
    const fresh = makeToken({ sub: "me@example.com" })
    const fetch = mockFetch(jsonResponse(200, { access_token: fresh, email: "me@example.com" }))
    setSession(makeToken({ iat: staleIat() }), "email")

    const { result } = renderHook(() => useAuth({ required: true }))

    await waitFor(() => expect(getToken()).toBe(fresh))
    expect(result.current.status).toBe("authenticated")
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it("shows the session-expired screen when the stored token has expired (idle > 7 days)", async () => {
    const go = spyNavigation()
    const fetch = mockFetch(jsonResponse(200, {}))
    window.history.replaceState(null, "", "/dashboard")
    setSession(makeToken({ iat: now() - 8 * 86400, exp: now() - 86400 }), "email")

    renderHook(() => useAuth({ required: true }))

    await waitFor(() => expect(go).toHaveBeenCalled())
    expect(go.mock.calls[0][0]).toBe("/auth/session-expired?reason=AUTH_TOKEN_EXPIRED&next=%2Fdashboard")
    expect(getToken()).toBeNull()
    // Decided locally — no network round trip needed.
    expect(fetch).not.toHaveBeenCalled()
  })

  it("quietly signs out an expired session on public pages", async () => {
    const go = spyNavigation()
    setSession(makeToken({ exp: now() - 60 }), "email")
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.status).toBe("unauthenticated"))
    expect(go).not.toHaveBeenCalled()
    expect(getToken()).toBeNull()
  })

  it("treats a malformed stored token as an invalid session", async () => {
    const go = spyNavigation()
    localStorage.setItem("token", "garbage")
    renderHook(() => useAuth({ required: true }))
    await waitFor(() => expect(go).toHaveBeenCalled())
    expect(go.mock.calls[0][0]).toContain("reason=AUTH_TOKEN_INVALID")
  })

  it.each(["AUTH_TOKEN_EXPIRED", "AUTH_TOKEN_INVALID", "AUTH_USER_NOT_FOUND"])(
    "shows the session-expired screen when refresh says %s",
    async (code) => {
      const go = spyNavigation()
      mockFetch(apiError(401, code))
      setSession(makeToken({ iat: staleIat() }), "email")
      renderHook(() => useAuth({ required: true }))
      await waitFor(() => expect(go).toHaveBeenCalled())
      expect(go.mock.calls[0][0]).toContain(`reason=${code}`)
      expect(getToken()).toBeNull()
    }
  )

  it("stays signed in when the API is unreachable", async () => {
    const go = spyNavigation()
    mockFetch(new TypeError("Failed to fetch"))
    const token = makeToken({ iat: staleIat() })
    setSession(token, "email")
    const { result } = renderHook(() => useAuth({ required: true }))
    await waitFor(() => expect(result.current.status).toBe("authenticated"))
    await new Promise((r) => setTimeout(r, 10))
    expect(go).not.toHaveBeenCalled()
    expect(getToken()).toBe(token)
  })

  it("stays signed in when refresh hits a server error", async () => {
    const go = spyNavigation()
    mockFetch(apiError(500, "INTERNAL_ERROR"))
    setSession(makeToken({ iat: staleIat() }), "email")
    const { result } = renderHook(() => useAuth({ required: true }))
    await waitFor(() => expect(result.current.status).toBe("authenticated"))
    await new Promise((r) => setTimeout(r, 10))
    expect(go).not.toHaveBeenCalled()
  })
})

describe("useAuth — while the app is open", () => {
  it("ends the session when the token expires in an open tab", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const go = spyNavigation()
    setSession(makeToken({ exp: now() + 120 }), "email")

    const { result } = renderHook(() => useAuth({ required: true }))
    await waitFor(() => expect(result.current.status).toBe("authenticated"))
    expect(go).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(120_000)
    })
    expect(go).toHaveBeenCalledWith(expect.stringContaining("reason=AUTH_TOKEN_EXPIRED"))
  })

  it("re-checks when the tab becomes visible again (e.g. after sleep)", async () => {
    const go = spyNavigation()
    setSession(makeToken(), "email")
    const { result } = renderHook(() => useAuth({ required: true }))
    await waitFor(() => expect(result.current.status).toBe("authenticated"))

    // While hidden, the token lapsed.
    setSession(makeToken({ exp: now() - 10 }), "email")
    await act(async () => {
      window.dispatchEvent(new Event("focus"))
    })
    await waitFor(() => expect(go).toHaveBeenCalledWith(expect.stringContaining("reason=AUTH_TOKEN_EXPIRED")))
  })

  it("follows a sign-out in another tab", async () => {
    const go = spyNavigation()
    setSession(makeToken(), "email")
    window.history.replaceState(null, "", "/dashboard")
    const { result } = renderHook(() => useAuth({ required: true }))
    await waitFor(() => expect(result.current.status).toBe("authenticated"))

    localStorage.removeItem("token")
    await act(async () => {
      window.dispatchEvent(new StorageEvent("storage", { key: "token", newValue: null }))
    })
    await waitFor(() => expect(result.current.status).toBe("unauthenticated"))
    expect(go).toHaveBeenCalledWith("/login?next=%2Fdashboard")
  })

  it("picks up a sign-in from another tab", async () => {
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.status).toBe("unauthenticated"))

    setSession(makeToken({ sub: "other-tab@example.com" }), "email")
    await act(async () => {
      window.dispatchEvent(new StorageEvent("storage", { key: "token" }))
    })
    await waitFor(() => expect(result.current.status).toBe("authenticated"))
    expect(result.current.email).toBe("other-tab@example.com")
  })
})
