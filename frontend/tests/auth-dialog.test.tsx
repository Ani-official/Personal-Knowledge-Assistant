import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import AuthDialog, { validateCredentials } from "@/components/ui/auth-dialog"
import { ErrorDialogHost } from "@/components/ui/error-dialog"
import { getToken, navigation } from "@/lib/session"
import { apiError, jsonResponse, makeToken, mockFetch } from "./helpers"

vi.mock("next-themes", () => ({ useTheme: () => ({ theme: "light" }) }))

function renderDialog(props: Parameters<typeof AuthDialog>[0] = {}) {
  const user = userEvent.setup({ delay: null })
  render(
    <>
      <AuthDialog openByDefault hideTrigger {...props} />
      <ErrorDialogHost />
    </>
  )
  return user
}

async function fill(user: ReturnType<typeof userEvent.setup>, fields: { email?: string; password?: string; confirm?: string }) {
  if (fields.email !== undefined) await user.type(screen.getByLabelText("Email"), fields.email)
  if (fields.password !== undefined) await user.type(screen.getByLabelText("Password"), fields.password)
  if (fields.confirm !== undefined) await user.type(screen.getByLabelText("Confirm password"), fields.confirm)
}

async function errorDialog() {
  return within(await screen.findByTestId("error-dialog"))
}

describe("validateCredentials", () => {
  it.each([
    [true, "bad", "longenough", "longenough", "AUTH_EMAIL_INVALID"],
    [true, "a@b.co", "short", "short", "AUTH_PASSWORD_TOO_SHORT"],
    [true, "a@b.co", "€".repeat(25), "€".repeat(25), "AUTH_PASSWORD_TOO_LONG"],
    [true, "a@b.co", "longenough", "different1", "AUTH_PASSWORD_MISMATCH"],
    [true, "a@b.co", "longenough", "longenough", null],
    [false, "a@b.co", "", "", "AUTH_PASSWORD_REQUIRED"],
    // Sign-in does not enforce the new 8-character rule on existing passwords.
    [false, "a@b.co", "abc", "", null],
    [false, " a@b.co ", "x", "", null],
  ])("signup=%s email=%s → %s", (isSignup, email, password, confirm, expected) => {
    expect(validateCredentials(isSignup, email, password, confirm)).toBe(expected)
  })
})

describe("AuthDialog — sign in", () => {
  it("stores the session and continues to the requested page", async () => {
    const go = vi.spyOn(navigation, "go").mockImplementation(() => {})
    const token = makeToken()
    const fetch = mockFetch(jsonResponse(200, { access_token: token, email: "u@example.com" }))
    const user = renderDialog({ redirectTo: "/dashboard?doc=1" })

    await fill(user, { email: "  u@example.com ", password: "secret" })
    await user.click(screen.getByRole("button", { name: /^sign in$/i }))

    await waitFor(() => expect(go).toHaveBeenCalledWith("/dashboard?doc=1"))
    expect(getToken()).toBe(token)
    expect(localStorage.getItem("auth_type")).toBe("email")
    const body = JSON.parse((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    expect(body.email).toBe("u@example.com")
  })

  it("never redirects off-site after sign-in", async () => {
    const go = vi.spyOn(navigation, "go").mockImplementation(() => {})
    mockFetch(jsonResponse(200, { access_token: makeToken(), email: "u@example.com" }))
    const user = renderDialog({ redirectTo: "//evil.example" })
    await fill(user, { email: "u@example.com", password: "secret" })
    await user.click(screen.getByRole("button", { name: /^sign in$/i }))
    await waitFor(() => expect(go).toHaveBeenCalledWith("/dashboard"))
  })

  it("shows wrong credentials in a dialog with the error code and reference", async () => {
    mockFetch(apiError(401, "AUTH_INVALID_CREDENTIALS", "x", "req-77"))
    const user = renderDialog()
    await fill(user, { email: "u@example.com", password: "wrong" })
    await user.click(screen.getByRole("button", { name: /^sign in$/i }))

    const dialog = await errorDialog()
    expect(dialog.getByText("Couldn't sign you in")).toBeInTheDocument()
    expect(dialog.getByText("AUTH_INVALID_CREDENTIALS")).toBeInTheDocument()
    expect(dialog.getByText("req-77")).toBeInTheDocument()
    expect(getToken()).toBeNull()
  })

  it("offers Google when the account was created with Google", async () => {
    mockFetch(apiError(401, "AUTH_USE_GOOGLE_SIGNIN"))
    const user = renderDialog()
    await fill(user, { email: "g@example.com", password: "whatever" })
    await user.click(screen.getByRole("button", { name: /^sign in$/i }))

    const dialog = await errorDialog()
    expect(dialog.getByText("Use Google to sign in")).toBeInTheDocument()
    expect(dialog.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument()
  })

  it("explains rate limiting", async () => {
    mockFetch(apiError(429, "RATE_LIMITED"))
    const user = renderDialog()
    await fill(user, { email: "u@example.com", password: "x" })
    await user.click(screen.getByRole("button", { name: /^sign in$/i }))
    expect((await errorDialog()).getByText("Too many attempts")).toBeInTheDocument()
  })

  it("explains a network failure", async () => {
    mockFetch(new TypeError("Failed to fetch"))
    const user = renderDialog()
    await fill(user, { email: "u@example.com", password: "x" })
    await user.click(screen.getByRole("button", { name: /^sign in$/i }))
    expect((await errorDialog()).getByText("Can't reach the server")).toBeInTheDocument()
  })

  it("explains a gateway error page (non-JSON)", async () => {
    mockFetch(new Response("<html>502</html>", { status: 502 }))
    const user = renderDialog()
    await fill(user, { email: "u@example.com", password: "x" })
    await user.click(screen.getByRole("button", { name: /^sign in$/i }))
    expect((await errorDialog()).getByText("Service unavailable")).toBeInTheDocument()
  })

  it("rejects a success response without a token", async () => {
    mockFetch(jsonResponse(200, { message: "ok" }))
    const user = renderDialog()
    await fill(user, { email: "u@example.com", password: "x" })
    await user.click(screen.getByRole("button", { name: /^sign in$/i }))
    expect((await errorDialog()).getByText("Unexpected response")).toBeInTheDocument()
    expect(getToken()).toBeNull()
  })

  it("validates the email before calling the API", async () => {
    const fetch = mockFetch(jsonResponse(200, {}))
    const user = renderDialog()
    await fill(user, { email: "not-an-email", password: "x" })
    await user.click(screen.getByRole("button", { name: /^sign in$/i }))
    expect((await errorDialog()).getByText("Check your email")).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("shows the reason for signing in again", () => {
    renderDialog({ notice: "Your session expired. Sign in again to pick up where you left off." })
    expect(screen.getByRole("status")).toHaveTextContent(/session expired/i)
  })
})

describe("AuthDialog — sign up", () => {
  it("signs the new user in with the token the API returns", async () => {
    const go = vi.spyOn(navigation, "go").mockImplementation(() => {})
    const token = makeToken({ sub: "new@example.com" })
    mockFetch(jsonResponse(201, { access_token: token, email: "new@example.com" }))
    const user = renderDialog({ mode: "signup" })

    await fill(user, { email: "new@example.com", password: "longenough", confirm: "longenough" })
    await user.click(screen.getByRole("button", { name: /create account/i }))

    await waitFor(() => expect(go).toHaveBeenCalledWith("/dashboard"))
    expect(getToken()).toBe(token)
    expect(getToken()).not.toBe("undefined")
  })

  it.each([
    [{ password: "short", confirm: "short" }, "Password too short"],
    [{ password: "longenough", confirm: "different1" }, "Passwords don't match"],
    [{ password: "€".repeat(25), confirm: "€".repeat(25) }, "Password too long"],
  ])("blocks invalid input in a dialog: %o", async (fields, title) => {
    const fetch = mockFetch(jsonResponse(201, {}))
    const user = renderDialog({ mode: "signup" })
    await fill(user, { email: "new@example.com", ...fields })
    await user.click(screen.getByRole("button", { name: /create account/i }))
    expect((await errorDialog()).getByText(title)).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("offers to switch to sign-in when the email is taken", async () => {
    mockFetch(apiError(409, "AUTH_EMAIL_TAKEN"))
    const user = renderDialog({ mode: "signup" })
    await fill(user, { email: "taken@example.com", password: "longenough", confirm: "longenough" })
    await user.click(screen.getByRole("button", { name: /create account/i }))

    const dialog = await errorDialog()
    await user.click(dialog.getByRole("button", { name: "Sign in instead" }))
    expect(await screen.findByText("Welcome back")).toBeInTheDocument()
  })

  it("shows server-side password rules in a dialog", async () => {
    mockFetch(apiError(422, "AUTH_PASSWORD_TOO_SHORT"))
    const user = renderDialog({ mode: "signup" })
    await fill(user, { email: "new@example.com", password: "longenough", confirm: "longenough" })
    await user.click(screen.getByRole("button", { name: /create account/i }))
    expect((await errorDialog()).getByText("Password too short")).toBeInTheDocument()
  })
})

describe("AuthDialog — Google", () => {
  it("remembers where to land after the Google round trip", async () => {
    const hrefSetter = vi.fn()
    const original = window.location
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...original, set href(v: string) { hrefSetter(v) } },
    })
    try {
      const user = renderDialog({ redirectTo: "/dashboard?doc=9" })
      await user.click(screen.getByRole("button", { name: /continue with google/i }))
      expect(hrefSetter).toHaveBeenCalledWith("http://api.test/auth/login/google")
      expect(sessionStorage.getItem("post_login_next")).toBe("/dashboard?doc=9")
    } finally {
      Object.defineProperty(window, "location", { configurable: true, value: original })
    }
  })
})
