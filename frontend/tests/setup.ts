import "@testing-library/jest-dom/vitest"
import { afterEach, beforeEach, vi } from "vitest"
import { cleanup } from "@testing-library/react"

import { __resetSessionStateForTests } from "@/lib/session"
import { dismissErrorDialog } from "@/lib/error-dialog"

// jsdom has no layout, so element scrolling isn't implemented.
Element.prototype.scrollTo ??= function () {}
Element.prototype.scrollIntoView ??= function () {}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  __resetSessionStateForTests()
  // window.alert must never be used; fail loudly if anything calls it.
  vi.spyOn(window, "alert").mockImplementation(() => {
    throw new Error("window.alert was called")
  })
})

afterEach(() => {
  cleanup()
  dismissErrorDialog()
  vi.useRealTimers()
})
