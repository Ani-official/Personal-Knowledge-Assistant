"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Loader2,
  Bot,
  User,
  Send,
  Trash2,
  ChevronDown,
  Key,
  X,
  Copy,
  Check,
  MessagesSquare,
} from "lucide-react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { ModelSelector } from "./model-selector"
import { cn } from "@/lib/utils"

const FREE_CHAT_LIMIT = 5
const FREE_CHAT_COUNT_KEY = "knowai-free-chat-count"

type ChatMessage = { type: "user" | "ai"; text: string }

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

function normalizeMarkdownText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\u2028|\u2029/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

async function copyToClipboard(text: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    throw new Error("Clipboard API unavailable")
  }

  await navigator.clipboard.writeText(text)
}

function inferCodeLanguage(className?: string) {
  const match = className?.match(/language-([\w+-]+)/)
  if (!match) return "Code"
  return match[1].replace(/^\w/, (char) => char.toUpperCase())
}

function CopyButton({
  text,
  label,
  className,
}: {
  text: string
  label: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await copyToClipboard(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/85 px-2.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:text-foreground",
        className
      )}
      aria-label={label}
      title={label}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  )
}

function CodeBlock({
  className,
  children,
}: {
  className?: string
  children?: React.ReactNode
}) {
  const codeText = String(children ?? "").replace(/\n$/, "")
  const languageLabel = inferCodeLanguage(className)

  return (
    <div className="my-5 overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/90 px-3 py-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
          {languageLabel}
        </span>
        <CopyButton
          text={codeText}
          label="Copy code block"
          className="border-slate-700 bg-slate-900/80 text-slate-300 hover:border-slate-500 hover:bg-slate-800/90 hover:text-white"
        />
      </div>
      <pre className="overflow-x-auto px-4 py-4 text-[13px] leading-6 text-slate-100">
        <code className={cn("font-mono text-[13px]", className)}>{children}</code>
      </pre>
    </div>
  )
}

const markdownComponents: Components = {
  p: ({ children }) => (
    <p className="my-4 text-[15px] leading-7 text-foreground/95">{children}</p>
  ),
  h1: ({ children }) => (
    <h1 className="mt-8 mb-4 text-2xl font-semibold tracking-tight text-foreground">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-7 mb-3 text-xl font-semibold tracking-tight text-foreground">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-6 mb-3 text-base font-semibold text-foreground">{children}</h3>
  ),
  ul: ({ children }) => (
    <ul className="my-4 ml-5 list-disc space-y-2 text-[15px] leading-7">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-4 ml-5 list-decimal space-y-2 text-[15px] leading-7">{children}</ol>
  ),
  li: ({ children }) => <li className="pl-1 marker:text-muted-foreground">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-5 border-l-2 border-primary/30 pl-4 text-[15px] italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-6 border-border/70" />,
  a: ({ children, ...props }) => (
    <a
      {...props}
      className="font-medium text-primary underline underline-offset-4 transition-colors hover:text-primary/80"
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="my-5 overflow-x-auto rounded-2xl border border-border/70">
      <table className="min-w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/70 text-left">{children}</thead>,
  th: ({ children }) => <th className="px-4 py-3 font-medium text-foreground">{children}</th>,
  td: ({ children }) => (
    <td className="border-t border-border/60 px-4 py-3 align-top text-foreground/90">
      {children}
    </td>
  ),
  code: ({ children, className, ...props }) => {
    const codeText = String(children ?? "")
    const isBlock = Boolean(className?.includes("language-")) || codeText.includes("\n")

    if (isBlock) {
      return <CodeBlock className={className}>{children}</CodeBlock>
    }

    return (
      <code
        {...props}
        className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[13px] text-foreground"
      >
        {children}
      </code>
    )
  },
  pre: ({ children }) => <>{children}</>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
}

function MarkdownMessage({
  text,
  streaming = false,
}: {
  text: string
  streaming?: boolean
}) {
  const content = normalizeMarkdownText(text)

  if (!content && !streaming) return null

  return (
    <div className={cn("markdown-message max-w-none text-foreground", streaming && "typing-cursor")}>
      {content ? (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {content}
        </ReactMarkdown>
      ) : (
        <span className="text-muted-foreground">&nbsp;</span>
      )}
    </div>
  )
}

export default function ChatPanel({ docId }: { docId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
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

  useEffect(() => {
    if (!hasOwnApiKey() && getFreeCount() >= FREE_CHAT_LIMIT) {
      setShowKeyBanner(true)
    }
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem(`chat-messages-${docId}`)
    setMessages(stored ? JSON.parse(stored) : [])
    setInput("")
    setAiTyping("")
  }, [docId])

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`chat-messages-${docId}`, JSON.stringify(messages))
    }
  }, [messages, docId])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, aiTyping])

  const handleScroll = () => {
    const el = scrollAreaRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    setShowScrollBtn(!atBottom)
  }

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

    const userMessage: ChatMessage = { type: "user", text: trimmed }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setAiTyping(" ")
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
            setMessages((prev) => [...prev, { type: "ai", text: normalizeMarkdownText(aiResponse) }])
            setAiTyping("")
            return
          }

          try {
            const parsed = JSON.parse(data)
            const delta = parsed?.choices?.[0]?.delta?.content
            if (delta) {
              aiResponse += delta
              await new Promise((resolve) => setTimeout(resolve, 18))
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
    <div className="flex h-full flex-col">
      {messages.length > 0 && (
        <div className="flex shrink-0 items-center justify-between border-b border-border/50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/60 bg-card/80 shadow-sm">
              <MessagesSquare className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Conversation</p>
              <p className="text-xs text-muted-foreground">Grounded answers from your selected document</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={clearConversation}
            className="rounded-full border-border/70 bg-background/70 px-3 text-xs text-muted-foreground shadow-sm hover:bg-accent hover:text-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear chat
          </Button>
        </div>
      )}

      <div
        ref={scrollAreaRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scrollbar-thin"
      >
        {messages.length === 0 && !aiTyping ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Bot className="h-7 w-7 text-primary" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Ask anything</h3>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              I&apos;ve read your document. Ask me about it and I&apos;ll stay grounded in the uploaded content.
            </p>
            <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
              {["Summarize this document", "What are the key points?", "Explain the main topic"].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q)
                    textareaRef.current?.focus()
                  }}
                  className="rounded-xl border border-border/60 px-4 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/40 hover:text-foreground"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-8 px-5 py-8">
            {messages.map((msg, i) => (
              <MessageBubble key={i} type={msg.type} text={msg.text} />
            ))}

            {aiTyping && (
              <div className="flex gap-3">
                <Avatar type="ai" />
                <div className="min-w-0 flex-1">
                  {aiTyping.trim() ? (
                    <div className="rounded-3xl rounded-tl-xl border border-border/60 bg-card/90 px-5 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-sm">
                      <MarkdownMessage text={aiTyping} streaming />
                    </div>
                  ) : (
                    <span className="typing-cursor text-muted-foreground">&nbsp;</span>
                  )}
                </div>
              </div>
            )}

            <div ref={scrollRef} />
          </div>
        )}
      </div>

      {showScrollBtn && (
        <button
          onClick={() => scrollRef.current?.scrollIntoView({ behavior: "smooth" })}
          className="absolute bottom-24 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground shadow-md transition-colors hover:text-foreground"
        >
          <ChevronDown className="h-3 w-3" />
          Scroll to bottom
        </button>
      )}

      {showKeyBanner && (
        <div className="mx-4 mb-2 flex shrink-0 items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800/50 dark:bg-amber-950/30">
          <Key className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-amber-900 dark:text-amber-200">
              You&apos;ve used {FREE_CHAT_LIMIT} free AI responses
            </p>
            <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300/80">
              Add your own{" "}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline underline-offset-2"
              >
                OpenRouter API key
              </a>{" "}
              (free credits available) in the sidebar to keep chatting without limits.
            </p>
          </div>
          <button
            onClick={() => setShowKeyBanner(false)}
            className="shrink-0 text-amber-500 transition-colors hover:text-amber-700 dark:hover:text-amber-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="shrink-0 border-t border-border/50 bg-background p-4">
        <div className="mx-auto max-w-3xl">
          <div className="relative flex flex-col rounded-2xl border border-border/60 bg-muted/50 shadow-sm transition-all focus-within:border-primary/50 focus-within:bg-background">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                adjustHeight()
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your document... (Shift+Enter for new line)"
              rows={1}
              disabled={loading}
              className="max-h-40 w-full resize-none overflow-y-auto bg-transparent px-4 pt-3.5 pb-2 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/60 disabled:opacity-60 scrollbar-thin"
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
                className="h-8 w-8 shrink-0 rounded-xl shadow-sm shadow-primary/20"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground/50">
            AI can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  )
}

function Avatar({ type }: { type: "user" | "ai" }) {
  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border shadow-sm",
        type === "ai"
          ? "border-primary/15 bg-primary/10 text-primary"
          : "border-border/70 bg-muted text-muted-foreground"
      )}
    >
      {type === "ai" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
    </div>
  )
}

function MessageBubble({ type, text }: ChatMessage) {
  if (type === "user") {
    return (
      <div className="flex justify-end gap-3">
        <div className="max-w-[80%] rounded-3xl rounded-tr-lg bg-primary px-4 py-3.5 text-sm leading-7 text-primary-foreground shadow-[0_12px_30px_rgba(8,145,178,0.18)]">
          {text}
        </div>
        <Avatar type="user" />
      </div>
    )
  }

  return (
    <div className="group flex gap-3">
      <Avatar type="ai" />
      <div className="min-w-0 flex-1">
        <div className="overflow-hidden rounded-3xl rounded-tl-xl border border-border/60 bg-card/90 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-sm">
          <div className="flex items-center justify-end border-b border-border/50 px-3 py-2">
            <CopyButton
              text={text}
              label="Copy full response"
              className="opacity-70 transition-opacity hover:opacity-100 group-hover:opacity-100"
            />
          </div>
          <div className="px-5 py-4">
            <MarkdownMessage text={text} />
          </div>
        </div>
      </div>
    </div>
  )
}
