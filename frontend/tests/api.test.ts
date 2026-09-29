import { describe, expect, it, vi } from "vitest"

import { apiFetch, apiJson } from "@/lib/api"
import { ApiError, parseApiError, toApiError } from "@/lib/api-errors"
import { getToken, navigation, setSession } from "@/lib/session"
import { apiError, jsonResponse, makeToken, mockFetch } from "./helpers"

describe("parseApiError", () => {
  it("reads the structured envelope and request id", async () => {
    const err = await parseApiError(apiError(401, "AUTH_INVALID_CREDENTIALS", "server words", "req-42"))
    expect(err).toBeInstanceOf(ApiError)
    expect(err.code).toBe("AUTH_INVALID_CREDENTIALS")
    expect(err.status).toBe(401)
    expect(err.requestId).toBe("req-42")
    // Auth codes use the client's own copy, not the server's wording.
    expect(err.title).toBe("Couldn't sign you in")
    expect(err.message).toMatch(/email or password is incorrect/i)
  })

  it("keeps a route's own message for non-auth codes", async () => {
    const err = await parseApiError(apiError(404, "NOT_FOUND", "Document not found"))
    expect(err.code).toBe("NOT_FOUND")
    expect(err.message).toBe("Document not found")
  })

  it("keeps the server message for codes the client doesn't know", async () => {
    const err = await parseApiError(apiError(400, "SOMETHING_NEW", "Brand new failure"))
    expect(err.code).toBe("SOMETHING_NEW")
    expect(err.message).toBe("Brand new failure")
  })

  it("carries validation fields", async () => {
    const res = jsonResponse(422, {
      error: { code: "VALIDATION_FAILED", message: "m", status: 422, fields: [{ field: "email", message: "required" }] },
    })
    const err = await parseApiError(res)
    expect(err.fields).toEqual([{ field: "email", message: "required" }])
  })

  it("understands legacy { detail } bodies", async () => {
    const err = await parseApiError(jsonResponse(404, { detail: "Conversation not found" }))
    expect(err.code).toBe("NOT_FOUND")
    expect(err.message).toBe("Conversation not found")
  })

  it("handles non-JSON gateway pages", async () => {
    const err = await parseApiError(new Response("<html>Bad Gateway</html>", { status: 502 }))
    expect(err.code).toBe("SERVICE_UNAVAILABLE")
    expect(err.title).toBe("Service unavailable")
  })

  it.each([
    [429, "RATE_LIMITED"],
    [422, "VALIDATION_FAILED"],
    [500, "INTERNAL_ERROR"],
    [503, "SERVICE_UNAVAILABLE"],
  ])("maps bare status %i to %s", async (status, code) => {
    const err = await parseApiError(new Response("", { status }))
    expect(err.code).toBe(code)
  })
})

describe("toApiError", () => {
  it("maps fetch TypeErrors to NETWORK_ERROR", () => {
    expect(toApiError(new TypeError("Failed to fetch")).code).toBe("NETWORK_ERROR")
  })
  it("maps JSON SyntaxErrors to INVALID_RESPONSE", () => {
    expect(toApiError(new SyntaxError("Unexpected token")).code).toBe("INVALID_RESPONSE")
  })
  it("passes ApiErrors through", () => {
    const err = new ApiError({ code: "RATE_LIMITED" })
    expect(toApiError(err)).toBe(err)
  })
  it("maps anything else to INTERNAL_ERROR", () => {
    expect(toApiError("boom").code).toBe("INTERNAL_ERROR")
  })
})

describe("apiFetch", () => {
  it("attaches the bearer token and resolves ok responses", async () => {
    setSession("tok-1", "email")
    const fetch = mockFetch(jsonResponse(200, [{ id: 1 }]))
    await expect(apiJson("/documents/")).resolves.toEqual([{ id: 1 }])
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe("http://api.test/documents/")
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer tok-1")
  })

  it("keeps caller headers", async () => {
    setSession("tok-1", "email")
    const fetch = mockFetch(jsonResponse(200, {}))
    await apiFetch("/x", { headers: { "Content-Type": "application/json" } })
    const init = (fetch.mock.calls[0] as unknown as [string, RequestInit])[1]
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json")
  })

  it.each(["AUTH_TOKEN_EXPIRED", "AUTH_TOKEN_INVALID", "AUTH_USER_NOT_FOUND", "AUTH_TOKEN_MISSING"])(
    "a 401 %s ends the session and shows the session-expired screen",
    async (code) => {
      const go = vi.spyOn(navigation, "go").mockImplementation(() => {})
      setSession(makeToken(), "email")
      mockFetch(apiError(401, code))

      await expect(apiFetch("/documents/")).rejects.toMatchObject({ code })
      expect(getToken()).toBeNull()
      expect(go).toHaveBeenCalledWith(expect.stringContaining(`/auth/session-expired?reason=${code}`))
    }
  )

  it("does not end the session for non-session 401s", async () => {
    const go = vi.spyOn(navigation, "go").mockImplementation(() => {})
    setSession("tok", "email")
    mockFetch(apiError(401, "AUTH_INVALID_CREDENTIALS"))
    await expect(apiFetch("/x")).rejects.toMatchObject({ code: "AUTH_INVALID_CREDENTIALS" })
    expect(getToken()).toBe("tok")
    expect(go).not.toHaveBeenCalled()
  })

  it("does not show session-expired to someone who was never signed in", async () => {
    const go = vi.spyOn(navigation, "go").mockImplementation(() => {})
    mockFetch(apiError(401, "AUTH_TOKEN_MISSING"))
    await expect(apiFetch("/x")).rejects.toMatchObject({ code: "AUTH_TOKEN_MISSING" })
    expect(go).not.toHaveBeenCalled()
  })

  it("does not end the session on 403 or 5xx", async () => {
    const go = vi.spyOn(navigation, "go").mockImplementation(() => {})
    setSession("tok", "email")
    mockFetch(apiError(403, "FORBIDDEN"), apiError(500, "INTERNAL_ERROR"))
    await expect(apiFetch("/x")).rejects.toMatchObject({ code: "FORBIDDEN" })
    await expect(apiFetch("/x")).rejects.toMatchObject({ code: "INTERNAL_ERROR" })
    expect(go).not.toHaveBeenCalled()
    expect(getToken()).toBe("tok")
  })

  it("turns network failures into NETWORK_ERROR", async () => {
    mockFetch(new TypeError("Failed to fetch"))
    await expect(apiFetch("/x")).rejects.toMatchObject({ code: "NETWORK_ERROR" })
  })

  it("turns an unreadable success body into INVALID_RESPONSE", async () => {
    mockFetch(new Response("not json", { status: 200 }))
    await expect(apiJson("/x")).rejects.toMatchObject({ code: "INVALID_RESPONSE" })
  })
})
