import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import DocumentReader from "@/components/dashboard/document-reader"
import { setSession } from "@/lib/session"
import { apiError, jsonResponse, makeToken, mockFetch } from "./helpers"

const page = (n: number, text: string) => ({
  doc_id: "d1",
  filename: "handbook.pdf",
  page_number: n,
  page_count: 12,
  page_label: "page",
  text,
})

describe("DocumentReader", () => {
  it("opens the cited page and highlights the passage", async () => {
    setSession(makeToken(), "email")
    const fetch = mockFetch(jsonResponse(200, page(3, "Section 4.\n\nEmployees receive 24 days of paid leave.")))
    render(
      <DocumentReader
        target={{ docId: "d1", filename: "handbook.pdf", page: 3, highlight: "Employees receive 24 days of paid leave." }}
        onClose={() => {}}
        onNavigate={() => {}}
      />
    )
    expect(await screen.findByText("page 3 of 12")).toBeInTheDocument()
    expect(document.querySelector("mark")).toHaveTextContent("Employees receive 24 days of paid leave.")
    expect((fetch.mock.calls[0] as unknown as [string])[0]).toBe("http://api.test/documents/d1/pages/3")
  })

  it("shows the passage itself when the document has no page numbers", async () => {
    const fetch = mockFetch(jsonResponse(200, {}))
    render(
      <DocumentReader
        target={{ docId: "d1", filename: "old-notes.pdf", page: null, highlight: "Leave must be approved." }}
        onClose={() => {}}
        onNavigate={() => {}}
      />
    )
    expect(screen.getByText("Evidence")).toBeInTheDocument()
    expect(screen.getByText("old-notes.pdf")).toBeInTheDocument()
    expect(screen.getByText("Leave must be approved.")).toBeInTheDocument()
    expect(screen.getByText(/indexed before page numbers were kept/)).toBeInTheDocument()
    // No page to fetch, and no page navigation to offer.
    expect(fetch).not.toHaveBeenCalled()
    expect(screen.queryByRole("button", { name: /previous page/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /next page/i })).not.toBeInTheDocument()
  })

  it("closes from its own button", async () => {
    const onClose = vi.fn()
    render(
      <DocumentReader
        target={{ docId: "d1", filename: "x.pdf", page: null, highlight: "p" }}
        onClose={onClose}
        onNavigate={() => {}}
      />
    )
    await userEvent.click(screen.getByRole("button", { name: "Close reader" }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("pages forward and back", async () => {
    setSession(makeToken(), "email")
    mockFetch(jsonResponse(200, page(3, "Page three.")))
    const onNavigate = vi.fn()
    render(
      <DocumentReader target={{ docId: "d1", filename: "h.pdf", page: 3 }} onClose={() => {}} onNavigate={onNavigate} />
    )
    await screen.findByText("Page three.")
    await userEvent.click(screen.getByRole("button", { name: /next page/i }))
    await userEvent.click(screen.getByRole("button", { name: /previous page/i }))
    expect(onNavigate.mock.calls).toEqual([[4], [2]])
  })

  it("explains a page that can't be loaded", async () => {
    setSession(makeToken(), "email")
    mockFetch(apiError(409, "CONFLICT", "This document was indexed before page text was stored. Re-upload it to use the reader."))
    render(
      <DocumentReader target={{ docId: "d1", filename: "h.pdf", page: 2 }} onClose={() => {}} onNavigate={() => {}} />
    )
    await waitFor(() => expect(screen.getByText(/Re-upload it to use the reader/)).toBeInTheDocument())
  })
})
