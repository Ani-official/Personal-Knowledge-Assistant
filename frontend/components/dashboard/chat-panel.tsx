"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Bot, User, Send, Trash2, ChevronDown, Key, X } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { ModelSelector } from "./model-selector"
import { cn } from "@/lib/utils"

const FREE_CHAT_LIMIT = 5
const FREE_CHAT_COUNT_KEY = "knowai-free-chat-count"

/** Returns true if the user has configured their own API key (local or server-linked). */
function hasOwnApiKey(): boolean {
  if (typeof window === "undefined") return false
  return !!(
    localStorage.getItem("user-api-key") ||
    localStorage.getItem("knowai-key-linked")
  )
}

function getFreeCount(): number {
  return parseInt(localStorage.getItem(FREE_CHAT_COUNT_KEY) ?? "0", 10)
}

function incrementFreeCount(): number {
  const next = getFreeCount() + 1
  localStorage.setItem(FREE_CHAT_COUNT_KEY, String(next))
  return next
}

export default function ChatPanel({ docId }: { docId: string }) {
  const [messages, setMessages] = useState<{ type: "user" | "ai"; text: string }[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [aiTyping, setAiTyping] = useState("")
  const [selectedModel, setSelectedModel] = useState(
    () =>
      (typeof window !== "undefined" && localStorage.getItem("selected-model")) ||
      "meta-llama/llama-3.3-70b-instruct:free"
  )
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [showKeyBanner, setShowKeyBanner] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const apiBase = process.env.NEXT_PUBLIC_API_URL

  // Show banner on mount if already over limit with no own key
  useEffect(() => {
    if (!hasOwnApiKey() && getFreeCount() >= FREE_CHAT_LIMIT) {
      setShowKeyBanner(true)
    }
  }, [])

  // Load saved messages for this doc
  useEffect(() => {
    const stored = localStorage.getItem(`chat-messages-${docId}`)
    setMessages(stored ? JSON.parse(stored) : [])
    setInput("")
    setAiTyping("")
  }, [docId])

  // Save messages on every change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`chat-messages-${docId}`, JSON.stringify(messages))
    }
  }, [messages, docId])

  // Auto scroll to bottom when new content arrives
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, aiTyping])

  // Show scroll-to-bottom button when user scrolls up
  const handleScroll = () => {
    const el = scrollAreaRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    setShowScrollBtn(!atBottom)
  }

  // Auto-resize textarea
  const adjustHeight = () => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`
  }

  const clearConversation = () => {
    setMessages([])
    setAiTyping("")
    localStorage.removeItem(`chat-messages-${docId}`)
  }

  const sendMessage = async () => {
    const trimmed = input.trim()
    if (!trimmed || loading) return

    const userMessage = { type: "user" as const, text: trimmed }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setAiTyping(" ") // show typing indicator immediately
    setLoading(true)

    if (textareaRef.current) textareaRef.current.style.height = "auto"

    try {
      const token = localStorage.getItem("token")

      const res = await fetch(`${apiBase}/chat/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: token ? "omit" : "include",
        body: JSON.stringify({ doc_id: docId, question: trimmed, model: selectedModel }),
      })

      // Track fallback key usage — prompt after FREE_CHAT_LIMIT uses
      if (res.headers.get("X-Fallback-Key") === "true" && !hasOwnApiKey()) {
        const count = incrementFreeCount()
        if (count >= FREE_CHAT_LIMIT) setShowKeyBanner(true)
      }

      if (!res.body) throw new Error("No response body from server.")

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let aiResponse = ""
      setAiTyping("")

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })

        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue
          const data = line.slice(6).trim()
          if (!data) continue
          if (data === "[DONE]") {
            setMessages((prev) => [...prev, { type: "ai", text: aiResponse }])
            setAiTyping("")
            return
          }
          try {
            const parsed = JSON.parse(data)
            const delta = parsed?.choices?.[0]?.delta?.content
            if (delta) {
              aiResponse += delta
              await new Promise((r) => setTimeout(r, 18))
              setAiTyping(aiResponse)
            }
          } catch {
            aiResponse += data
            setAiTyping(aiResponse)
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { type: "ai", text: "Something went wrong. Please try again." },
      ])
      setAiTyping("")
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Chat header ────────────────────────────── */}
      {messages.length > 0 && (
        <div className="flex-shrink-0 flex items-center justify-end px-4 py-2 border-b border-border/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearConversation}
            className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1.5"
          >
            <Trash2 className="w-3 h-3" />
            Clear chat
          </Button>
        </div>
      )}

      {/* ── Messages area ──────────────────────────── */}
      <div
        ref={scrollAreaRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scrollbar-thin"
      >
        {messages.length === 0 && !aiTyping ? (
          /* Empty state */
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <Bot className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Ask anything</h3>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              I've read your document. Ask me anything — I'll find the relevant information and explain it clearly.
            </p>
            <div className="mt-6 flex flex-col gap-2 w-full max-w-xs">
              {["Summarize this document", "What are the key points?", "Explain the main topic"].map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); textareaRef.current?.focus() }}
                  className="text-left text-sm px-4 py-2.5 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-accent/40 transition-colors text-muted-foreground hover:text-foreground"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.map((msg, i) => (
              <MessageBubble key={i} type={msg.type} text={msg.text} />
            ))}

            {/* Streaming response */}
            {aiTyping && (
              <div className="flex gap-3">
                <Avatar type="ai" />
                <div className="flex-1 pt-1 min-w-0">
                  {aiTyping.trim() ? (
                    <div className="typing-cursor prose prose-sm max-w-none dark:prose-invert text-foreground [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiTyping}</ReactMarkdown>
                    </div>
                  ) : (
                    <span className="text-muted-foreground typing-cursor">&nbsp;</span>
                  )}
                </div>
              </div>
            )}

            <div ref={scrollRef} />
          </div>
        )}
      </div>

      {/* Scroll-to-bottom button */}
      {showScrollBtn && (
        <button
          onClick={() => scrollRef.current?.scrollIntoView({ behavior: "smooth" })}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-background border border-border shadow-md rounded-full px-3 py-1.5 text-xs text-muted-foreground flex items-center gap-1.5 hover:text-foreground transition-colors z-10"
        >
          <ChevronDown className="w-3 h-3" /> Scroll to bottom
        </button>
      )}

      {/* ── API key nudge banner ────────────────────── */}
      {showKeyBanner && (
        <div className="flex-shrink-0 mx-4 mb-2 flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl px-4 py-3 text-sm">
          <Key className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-amber-900 dark:text-amber-200">
              You've used {FREE_CHAT_LIMIT} free AI responses
            </p>
            <p className="text-amber-700 dark:text-amber-300/80 text-xs mt-0.5">
              Add your own{" "}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 font-medium"
              >
                OpenRouter API key
              </a>{" "}
              (free credits available) in the sidebar to keep chatting without limits.
            </p>
          </div>
          <button
            onClick={() => setShowKeyBanner(false)}
            className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 flex-shrink-0 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Input area ─────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-border/50 bg-background p-4">
        <div className="max-w-3xl mx-auto">
          <div className="relative flex flex-col bg-muted/50 border border-border/60 rounded-2xl focus-within:border-primary/50 focus-within:bg-background transition-all shadow-sm">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); adjustHeight() }}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your document… (Shift+Enter for new line)"
              rows={1}
              disabled={loading}
              className="w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/60 disabled:opacity-60 scrollbar-thin max-h-40 overflow-y-auto"
            />
            <div className="flex items-center justify-between px-3 pb-2.5">
              <div className="max-w-[200px]">
                <ModelSelector
                  onChange={(model) => {
                    setSelectedModel(model)
                    localStorage.setItem("selected-model", model)
                  }}
                />
              </div>
              <Button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                size="icon"
                className="h-8 w-8 rounded-xl flex-shrink-0 shadow-sm shadow-primary/20"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <p className="text-center text-[11px] text-muted-foreground/50 mt-2">
            AI can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  )
}

function Avatar({ type }: { type: "user" | "ai" }) {
  return (
    <div className={cn(
      "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
      type === "ai" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
    )}>
      {type === "ai" ? <Bot className="w-4 h-4" /> : <User className="w-3.5 h-3.5" />}
    </div>
  )
}

function MessageBubble({ type, text }: { type: "user" | "ai"; text: string }) {
  if (type === "user") {
    return (
      <div className="flex justify-end gap-3">
        <div className="max-w-[80%] bg-primary text-primary-foreground px-4 py-3 rounded-2xl rounded-tr-md text-sm leading-relaxed">
          {text}
        </div>
        <Avatar type="user" />
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <Avatar type="ai" />
      <div className="flex-1 pt-0.5 min-w-0">
        <div className="prose prose-sm max-w-none dark:prose-invert text-foreground [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
