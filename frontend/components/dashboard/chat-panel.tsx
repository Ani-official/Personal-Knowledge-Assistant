"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Bot, User, Send } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { ModelSelector } from "./model-selector"

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

  const scrollRef = useRef<HTMLDivElement>(null)
  const apiBase = process.env.NEXT_PUBLIC_API_URL

  // Load saved messages for this doc
  useEffect(() => {
    const stored = localStorage.getItem(`chat-messages-${docId}`)
    setMessages(stored ? JSON.parse(stored) : [])
  }, [docId])

  // Save messages on every change
  useEffect(() => {
    localStorage.setItem(`chat-messages-${docId}`, JSON.stringify(messages))
  }, [messages, docId])

  // Auto scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, aiTyping])

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage = { type: "user" as const, text: input }
    setMessages((prev) => [...prev, userMessage])
    setLoading(true)
    setAiTyping("AI is typing...")

    try {
      const token = localStorage.getItem("token")

      const res = await fetch(`${apiBase}/chat/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: token ? "omit" : "include",
        body: JSON.stringify({
          doc_id: docId,
          question: input,
          model: selectedModel,
        }),
      })

      if (!res.body) throw new Error("No response body from server.")

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      let aiResponse = ""
      setAiTyping("") // clear placeholder once real stream starts

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })

        const lines = chunk.split("\n")
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const data = line.slice(6).trim()
          if (!data) continue

          if (data === "[DONE]") {
            // finalize response
            setMessages((prev) => [...prev, { type: "ai", text: aiResponse }])
            setAiTyping("")
            return
          }

          try {
            const parsed = JSON.parse(data)
            const delta = parsed?.choices?.[0]?.delta?.content
            if (delta) {
              aiResponse += delta
              // Add slight delay for natural typing effect
              await new Promise((r) => setTimeout(r, 25))
              setAiTyping((prev) => prev + delta)
            }
          } catch {
            // fallback: append raw text if not JSON
            aiResponse += data
            setAiTyping((prev) => prev + data)
          }
        }
      }
    } catch (err) {
      console.error("Chat error:", err)
      setMessages((prev) => [
        ...prev,
        { type: "ai", text: "❌ Server error. Please try again." },
      ])
      setAiTyping("")
    } finally {
      setLoading(false)
      setInput("")
    }
  }

  const Avatar = ({ type }: { type: "user" | "ai" }) => (
    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-muted shrink-0">
      {type === "user" ? <User className="w-3 h-3 sm:w-4 sm:h-4" /> : <Bot className="w-3 h-3 sm:w-4 sm:h-4" />}
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 pt-4 pb-4 space-y-4">
        {messages.length === 0 && !aiTyping && (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Bot className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Ask questions about your document. I'll help you find the information you need.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 sm:gap-3 ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
            {msg.type === "ai" && <Avatar type="ai" />}
            <div
              className={`max-w-[85%] sm:max-w-[75%] px-3 sm:px-4 py-2 sm:py-3 rounded-2xl text-sm shadow-sm ${
                msg.type === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted text-foreground rounded-bl-md"
              }`}
            >
              <div className="prose prose-sm max-w-none dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
              </div>
            </div>
            {msg.type === "user" && <Avatar type="user" />}
          </div>
        ))}

        {aiTyping && (
          <div className="flex gap-2 sm:gap-3 justify-start">
            <Avatar type="ai" />
            <div className="max-w-[85%] sm:max-w-[75%] px-3 sm:px-4 py-2 sm:py-3 rounded-2xl rounded-bl-md text-sm shadow-sm bg-muted text-foreground">
              <div className="prose prose-sm max-w-none dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiTyping}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Input area */}
      <div className="border-t bg-background p-3 sm:p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-3 sm:hidden">
            <ModelSelector
              onChange={(model: string) => {
                setSelectedModel(model)
                localStorage.setItem("selected-model", model)
              }}
            />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              sendMessage()
            }}
            className="flex items-end gap-2 sm:gap-3"
          >
            <div className="hidden sm:block flex-shrink-0 min-w-0 max-w-[200px]">
              <ModelSelector
                onChange={(model: string) => {
                  setSelectedModel(model)
                  localStorage.setItem("selected-model", model)
                }}
              />
            </div>

            <div className="flex-1 relative">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                className="pr-12 min-h-[44px] sm:min-h-[40px]"
                disabled={loading}
              />
              <Button
                type="submit"
                size="sm"
                disabled={loading || !input.trim()}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
