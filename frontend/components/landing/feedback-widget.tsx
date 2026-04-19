"use client"

import { useState } from "react"
import { MessageSquarePlus, X, Star, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const apiBase = process.env.NEXT_PUBLIC_API_URL

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [rating, setRating] = useState<number | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setName("")
    setEmail("")
    setMessage("")
    setRating(null)
    setHovered(null)
    setDone(false)
    setError(null)
  }

  const handleClose = () => {
    setOpen(false)
    setTimeout(reset, 300)
  }

  const handleSubmit = async () => {
    if (!message.trim()) {
      setError("Please write a message.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${apiBase}/feedback/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || null,
          email: email.trim() || null,
          message: message.trim(),
          rating,
        }),
      })
      if (!res.ok) throw new Error("Failed to submit")
      setDone(true)
      setTimeout(handleClose, 2000)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border border-border/60 bg-background/90 px-4 py-2.5 text-sm font-medium text-foreground shadow-lg backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
      >
        <MessageSquarePlus className="size-4" />
        Feedback
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
          onClick={handleClose}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          "fixed bottom-20 right-6 z-50 w-80 rounded-2xl border border-border/60 bg-background shadow-2xl shadow-primary/10 transition-all duration-200",
          open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <p className="text-sm font-semibold text-foreground">Share your feedback</p>
          <button
            onClick={handleClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="size-10 text-emerald-500" />
              <p className="text-sm font-medium text-foreground">Thanks for the feedback!</p>
              <p className="text-xs text-muted-foreground">It helps us improve EvidentiaAI.</p>
            </div>
          ) : (
            <>
              {/* Star rating */}
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">How would you rate it?</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onMouseEnter={() => setHovered(star)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => setRating(star === rating ? null : star)}
                      className="p-0.5 transition-transform hover:scale-110"
                    >
                      <Star
                        className={cn(
                          "size-6 transition-colors",
                          (hovered ?? rating ?? 0) >= star
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/40"
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Name & email */}
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Name (optional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-border/60 bg-muted/50 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none"
                />
                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-border/60 bg-muted/50 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none"
                />
              </div>

              {/* Message */}
              <textarea
                rows={3}
                placeholder="What do you think? Any bugs, ideas, or praise…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full resize-none rounded-xl border border-border/60 bg-muted/50 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none"
              />

              {error && <p className="text-xs text-destructive">{error}</p>}

              <Button
                onClick={handleSubmit}
                disabled={loading || !message.trim()}
                className="w-full h-9 rounded-xl text-sm"
              >
                {loading ? (
                  <><Loader2 className="size-3.5 animate-spin mr-2" />Sending…</>
                ) : (
                  "Send feedback"
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  )
}