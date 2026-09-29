import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import GoogleCallbackPage from "@/app/auth/google-callback/page"
import SessionExpiredPage from "@/app/auth/session-expired/page"
import LoginPage from "@/app/login/page"
import { ErrorDialogHost } from "@/components/ui/error-dialog"
import { showErrorDialog } from "@/lib/error-dialog"
import { getToken, navigation, setSession } from "@/lib/session"
import { makeToken } from "./helpers"

const router = { replace: vi.fn(), push: vi.fn() }

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(window.location.search),
}))
vi.mock("next-themes", () => ({ useTheme: () => ({ theme: "light" }) }))

beforeEach(() => {
  router.replace.mockReset()
  router.push.mockReset()
})

function at(url: string) {
  window.history.replaceState(null, "", url)
}

// --------------------------------------------------------------------------
describe("session-expired screen", () => {
  it("explains an idle timeout, including the policy", () => {
    at("/auth/session-expired?reason=AUTH_TOKEN_EXPIRED")
    render(<SessionExpiredPage />)
    expect(screen.getByRole("heading", { name: "Your session has expired" })).toBeInTheDocument()
    expect(screen.getByText(/7 days without activity/)).toBeInTheDocument()
    expect(screen.getByText(/30 days after you last signed in/)).toBeInTheDocument()
  })

  it.each([
    ["AUTH_TOKEN_INVALID", "Please sign in again"],
    ["AUTH_USER_NOT_FOUND", "Account not found"],
    ["AUTH_SESSION_REVOKED", "You were signed out"],
  ])("has distinct copy for %s", (reason, heading) => {
    at(`/auth/session-expired?reason=${reason}`)
    render(<SessionExpiredPage />)
    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument()
  })

  it("falls back to the expiry copy for unknown reasons", () => {
    at("/auth/session-expired?reason=<script>")
    render(<SessionExpiredPage />)
    expect(screen.getByRole("heading", { name: "Your session has expired" })).toBeInTheDocument()
  })

  it("'Sign in again' goes to login with the reason and return path", async () => {
    const go = vi.spyOn(navigation, "go").mockImplementation(() => {})
    at("/auth/session-expired?reason=AUTH_TOKEN_EXPIRED&next=%2Fdashboard%3Fdoc%3D1")
    render(<SessionExpiredPage />)
    await userEvent.click(screen.getByRole("button", { name: "Sign in again" }))
    expect(go).toHaveBeenCalledWith("/login?reason=AUTH_TOKEN_EXPIRED&next=%2Fdashboard%3Fdoc%3D1")
  })

  it("redirects to login automatically after the countdown", async () => {
    vi.useFakeTimers()
    const go = vi.spyOn(navigation, "go").mockImplementation(() => {})
    at("/auth/session-expired?reason=AUTH_TOKEN_EXPIRED")
    render(<SessionExpiredPage />)
    expect(screen.getByText(/in 10 seconds/)).toBeInTheDocument()

    for (let i = 0; i < 10; i++) {
      await act(async () => {
        vi.advanceTimersByTime(1000)
      })
    }
    expect(go).toHaveBeenCalledWith("/login?reason=AUTH_TOKEN_EXPIRED")
  })

  it("drops an off-site return path", async () => {
    const go = vi.spyOn(navigation, "go").mockImplementation(() => {})
    at("/auth/session-expired?reason=AUTH_TOKEN_EXPIRED&next=%2F%2Fevil.example")
    render(<SessionExpiredPage />)
    await userEvent.click(screen.getByRole("button", { name: "Sign in again" }))
    expect(go).toHaveBeenCalledWith("/login?reason=AUTH_TOKEN_EXPIRED")
  })
})

// --------------------------------------------------------------------------
describe("login page", () => {
  it("shows why the user is signing in again", async () => {
    at("/login?reason=AUTH_TOKEN_EXPIRED")
    render(<LoginPage />)
    expect(await screen.findByRole("status")).toHaveTextContent("Your session expired")
    expect(screen.getByText("Welcome back")).toBeInTheDocument()
  })

  it("has no notice on a plain visit", async () => {
    at("/login")
    render(<LoginPage />)
    await screen.findByText("Welcome back")
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("opens in sign-up mode on request", async () => {
    at("/login?mode=signup")
    render(<LoginPage />)
    expect(await screen.findByText("Create your account")).toBeInTheDocument()
  })

  it("sends an already-signed-in user on to their destination", async () => {
    setSession(makeToken(), "email")
    at("/login?next=%2Fdashboard%3Fdoc%3D3")
    render(<LoginPage />)
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/dashboard?doc=3"))
  })

  it("ignores an off-site next", async () => {
    setSession(makeToken(), "email")
    at("/login?next=https%3A%2F%2Fevil.example")
    render(<LoginPage />)
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/dashboard"))
  })

  it("closing the dialog returns home", async () => {
    at("/login")
    render(<LoginPage />)
    await screen.findByText("Welcome back")
    await userEvent.keyboard("{Escape}")
    expect(router.push).toHaveBeenCalledWith("/")
  })
})

// --------------------------------------------------------------------------
describe("Google callback", () => {
  function renderCallback() {
    render(
      <>
        <GoogleCallbackPage />
        <ErrorDialogHost />
      </>
    )
  }

  it("stores the token from the URL fragment and continues", async () => {
    const token = makeToken()
    sessionStorage.setItem("post_login_next", "/dashboard?doc=5")
    at(`/auth/google-callback#token=${token}&auth_type=google`)
    renderCallback()
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/dashboard?doc=5"))
    expect(getToken()).toBe(token)
    expect(localStorage.getItem("auth_type")).toBe("google")
    expect(sessionStorage.getItem("post_login_next")).toBeNull()
  })

  it("removes the token from the address bar", async () => {
    at(`/auth/google-callback#token=${makeToken()}&auth_type=google`)
    renderCallback()
    await waitFor(() => expect(router.replace).toHaveBeenCalled())
    expect(window.location.hash).toBe("")
    expect(window.location.search).toBe("")
  })

  it("still accepts the legacy query-string token", async () => {
    const token = makeToken()
    at(`/auth/google-callback?token=${token}&auth_type=google`)
    renderCallback()
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/dashboard"))
    expect(getToken()).toBe(token)
  })

  it("ignores an off-site stored destination", async () => {
    sessionStorage.setItem("post_login_next", "//evil.example")
    at(`/auth/google-callback#token=${makeToken()}`)
    renderCallback()
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/dashboard"))
  })

  it.each([
    ["AUTH_OAUTH_CANCELLED", "Google sign-in cancelled", true],
    ["AUTH_OAUTH_FAILED", "Google sign-in failed", true],
    ["AUTH_OAUTH_EMAIL_MISSING", "Google didn't share your email", true],
    ["AUTH_OAUTH_EMAIL_UNVERIFIED", "Email not verified", false],
  ])("shows %s in a dialog and goes to login", async (code, title, offersRetry) => {
    at(`/auth/google-callback#error=${code}`)
    renderCallback()
    const dialog = within(await screen.findByTestId("error-dialog"))
    expect(dialog.getByText(title)).toBeInTheDocument()
    expect(dialog.getByText(code)).toBeInTheDocument()
    expect(!!dialog.queryByRole("button", { name: "Try Google again" })).toBe(offersRetry)
    expect(router.replace).toHaveBeenCalledWith("/login")
    expect(getToken()).toBeNull()
  })

  it("treats a missing token as a failed sign-in", async () => {
    at("/auth/google-callback")
    renderCallback()
    expect(within(await screen.findByTestId("error-dialog")).getByText("Google sign-in failed")).toBeInTheDocument()
  })

  it("rejects a malformed token", async () => {
    at("/auth/google-callback#token=not-a-jwt")
    renderCallback()
    await screen.findByTestId("error-dialog")
    expect(getToken()).toBeNull()
  })

  it("rejects an already-expired token", async () => {
    at(`/auth/google-callback#token=${makeToken({ exp: Math.floor(Date.now() / 1000) - 60 })}`)
    renderCallback()
    await screen.findByTestId("error-dialog")
    expect(getToken()).toBeNull()
  })
})

// --------------------------------------------------------------------------
describe("error dialog host", () => {
  it("shows and dismisses", async () => {
    render(<ErrorDialogHost />)
    act(() => showErrorDialog({ title: "Boom", message: "It broke", code: "X_CODE", requestId: "r1" }))
    const dialog = within(await screen.findByTestId("error-dialog"))
    expect(dialog.getByText("Boom")).toBeInTheDocument()
    expect(dialog.getByText("It broke")).toBeInTheDocument()
    expect(dialog.getByText("X_CODE")).toBeInTheDocument()
    expect(dialog.getByText("r1")).toBeInTheDocument()
    await userEvent.click(dialog.getByRole("button", { name: "OK" }))
    await waitFor(() => expect(screen.queryByTestId("error-dialog")).not.toBeInTheDocument())
  })

  it("runs the action and closes", async () => {
    const onSelect = vi.fn()
    render(<ErrorDialogHost />)
    act(() => showErrorDialog({ title: "t", message: "m" }, { label: "Retry", onSelect }))
    const dialog = within(await screen.findByTestId("error-dialog"))
    await userEvent.click(dialog.getByRole("button", { name: "Retry" }))
    expect(onSelect).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByTestId("error-dialog")).not.toBeInTheDocument())
  })

  it("uses catalogue copy for a bare code", async () => {
    render(<ErrorDialogHost />)
    act(() => showErrorDialog({ code: "RATE_LIMITED" }))
    expect(within(await screen.findByTestId("error-dialog")).getByText("Too many attempts")).toBeInTheDocument()
  })

  it("the newest error replaces the previous one", async () => {
    render(<ErrorDialogHost />)
    act(() => showErrorDialog({ title: "First", message: "1" }))
    act(() => showErrorDialog({ title: "Second", message: "2" }))
    const dialog = within(await screen.findByTestId("error-dialog"))
    expect(dialog.getByText("Second")).toBeInTheDocument()
    expect(dialog.queryByText("First")).not.toBeInTheDocument()
  })
})
