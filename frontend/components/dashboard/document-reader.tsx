"use client"

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { DocumentPage } from "./types"

export type ReaderTarget = {
  docId: string
  page: number
  /** The retrieved passage, highlighted in the page when it can be located. */
  highlight?: string
}

/**
 * Collapse whitespace for matching while remembering where each surviving
 * character came from, so a match found in the flattened text can be mapped
 * back onto the original and the page keeps its line breaks.
 */
function flatten(text: string) {
  let flat = ""
  const origin: number[] = []
  let pendingSpace = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (/\s/.test(char)) {
      pendingSpace = flat.length > 0
      continue
    }
    if (pendingSpace) {
      flat += " "
      origin.push(i)
      pendingSpace = false
    }
    flat += char
    origin.push(i)
  }

  return { flat, origin }
}

/**
 * Locate the passage inside the page and split the *original* page text around
 * it. Chunks are cut by character count, so they routinely start or end
 * mid-word; shorter prefixes are tried before giving up. Returns null when
 * nothing matches, so the caller renders the page unhighlighted rather than
 * highlighting the wrong thing.
 */
function splitAroundHighlight(pageText: string, passage?: string) {
  if (!passage) return null

  const { flat, origin } = flatten(pageText)
  const needle = flatten(passage).flat
  if (!needle || !flat) return null

  for (const length of [needle.length, 200, 140, 90, 60]) {
    if (length > needle.length) continue

    // Trim a truncated prefix back to a word boundary; never trim the full
    // passage, or the last word of the citation is left out of the highlight.
    const candidate =
      length === needle.length ? needle : needle.slice(0, length).replace(/\s+\S*$/, "")
    if (candidate.length < 24) break

    const at = flat.indexOf(candidate)
    if (at === -1) continue

    let from = origin[at]
    let to = origin[at + candidate.length - 1] + 1

    // A chunk can begin or end mid-word, which would highlight "oc" out of
    // "occupations". Widen to the whole word at each edge.
    const isWordChar = (char: string | undefined) => !!char && /[\p{L}\p{N}]/u.test(char)
    while (from > 0 && isWordChar(pageText[from - 1]) && isWordChar(pageText[from])) from -= 1
    while (to < pageText.length && isWordChar(pageText[to]) && isWordChar(pageText[to - 1])) to += 1

    return {
      before: pageText.slice(0, from),
      match: pageText.slice(from, to),
      after: pageText.slice(to),
    }
  }
  return null
}

/**
 * Paint the cited passage one line at a time.
 *
 * A single span stretched across the whole passage paints its background over
 * the blank lines between paragraphs too, which reads as a stack of
 * disconnected blocks. Highlighting each non-empty line separately keeps the
 * blank lines clear.
 */
function HighlightedPassage({
  text,
  firstLineRef,
}: {
  text: string
  firstLineRef: React.RefObject<HTMLElement | null>
}) {
  const lines = text.split("\n")
  const firstFilled = lines.findIndex((line) => line.trim())

  return (
    <>
      {lines.map((line, index) => (
        <Fragment key={index}>
          {line.trim() ? (
            <mark
              ref={index === firstFilled ? firstLineRef : undefined}
              className="rounded bg-primary/15 font-medium text-primary"
            >
              {line}
            </mark>
          ) : (
            line
          )}
          {index < lines.length - 1 ? "\n" : null}
        </Fragment>
      ))}
    </>
  )
}

export default function DocumentReader({
  target,
  onClose,
  onNavigate,
}: {
  target: ReaderTarget
  onClose: () => void
  onNavigate: (page: number) => void
}) {
  const [page, setPage] = useState<DocumentPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const markRef = useRef<HTMLElement>(null)

  const fetchPage = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/documents/${target.docId}/pages/${target.page}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          credentials: token ? "omit" : "include",
        }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setPage(null)
        setError(body?.detail ?? "Could not load this page.")
        return
      }
      setPage(await res.json())
    } catch {
      setPage(null)
      setError("Could not load this page.")
    } finally {
      setLoading(false)
    }
  }, [target.docId, target.page])

  useEffect(() => {
    void fetchPage()
  }, [fetchPage])

  const segments = useMemo(
    () => (page ? splitAroundHighlight(page.text, target.highlight) : null),
    [page, target.highlight]
  )

  // Bring the cited passage into view once it has rendered.
  useEffect(() => {
    if (!segments || !markRef.current) return
    markRef.current.scrollIntoView({ block: "center", behavior: "smooth" })
  }, [segments])

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 })
  }, [target.page])

  const label = page?.page_label ?? "page"
  const atFirst = target.page <= 1
  const atLast = page ? target.page >= page.page_count : true

  return (
    <div className="flex h-full min-w-0 flex-col border-l border-border/60 bg-card/30">
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border/60 px-4">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="shrink-0 text-sm font-semibold">Extracted text</span>
          {page && (
            <span className="truncate text-xs text-muted-foreground">
              {label} {page.page_number} of {page.page_count}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            disabled={atFirst || loading}
            onClick={() => onNavigate(target.page - 1)}
            title={`Previous ${label}`}
            className="size-7 rounded-md border-border/70"
          >
            <ChevronLeft className="size-3.5" />
            <span className="sr-only">Previous {label}</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={atLast || loading}
            onClick={() => onNavigate(target.page + 1)}
            title={`Next ${label}`}
            className="size-7 rounded-md border-border/70"
          >
            <ChevronRight className="size-3.5" />
            <span className="sr-only">Next {label}</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            title="Close reader"
            className="size-7 rounded-md text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
            <span className="sr-only">Close reader</span>
          </Button>
        </div>
      </div>

      <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-5 scrollbar-thin">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading {label} {target.page}…
          </div>
        ) : error ? (
          <p className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
            {error}
          </p>
        ) : page ? (
          <p className="text-[15px] leading-7 whitespace-pre-wrap text-foreground/90">
            {segments ? (
              <>
                {segments.before}
                <HighlightedPassage text={segments.match} firstLineRef={markRef} />
                {segments.after}
              </>
            ) : (
              page.text
            )}
          </p>
        ) : null}
      </div>

      <p className={cn("shrink-0 border-t border-border/50 px-5 py-3 text-[11px] text-muted-foreground/70")}>
        Text extracted at indexing time — the original file isn&apos;t stored, so no page image is available.
      </p>
    </div>
  )
}
