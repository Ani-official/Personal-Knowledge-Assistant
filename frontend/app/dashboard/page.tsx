"use client"

import { useState, useEffect } from "react"
import { DashboardNavbar } from "@/components/dashboard/navbar"
import ChatPanel from "@/components/dashboard/chat-panel"
import DashboardSidebar from "@/components/dashboard/sidebar"
import type { ConversationSummary, DocumentItem } from "@/components/dashboard/types"
import { useAuth } from "@/lib/useAuth"
import AuthDialog from "@/components/ui/auth-dialog"
import { Bot, Plus } from "lucide-react"
import UploadFAB from "@/components/ui/upload-fab"
import { Button } from "@/components/ui/button"
import OnboardingTour from "@/components/dashboard/onboarding-tour"

export default function Dashboard() {
  const [docId, setDocId] = useState<string | null>(null)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(true)
  const [conversationsLoading, setConversationsLoading] = useState(true)
  const [tourKey, setTourKey] = useState(0)
  const [apiKeyOpen, setApiKeyOpen] = useState(false)
  const { status } = useAuth()

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token")
    return token ? { Authorization: `Bearer ${token}` } : undefined
  }

  const fetchDocuments = async () => {
    setDocumentsLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents/`, {
        headers: getAuthHeaders(),
        credentials: localStorage.getItem("token") ? "omit" : "include",
      })
      if (res.ok) {
        const data = await res.json()
        setDocuments(data)
        return data as DocumentItem[]
      }
    } catch (err) {
      console.error("Error fetching documents:", err)
    } finally {
      setDocumentsLoading(false)
    }
    return [] as DocumentItem[]
  }

  const fetchConversations = async () => {
    setConversationsLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/conversations/`, {
        headers: getAuthHeaders(),
        credentials: localStorage.getItem("token") ? "omit" : "include",
      })
      if (res.ok) {
        const data = await res.json()
        setConversations(data)
        return data as ConversationSummary[]
      }
    } catch (err) {
      console.error("Error fetching conversations:", err)
    } finally {
      setConversationsLoading(false)
    }
    return [] as ConversationSummary[]
  }

  const setScopeState = (nextDocId: string | null, nextConversationId: string | null) => {
    setDocId(nextDocId)
    setActiveConversationId(nextConversationId)

    if (nextDocId) {
      localStorage.setItem("activeDocId", nextDocId)
    } else {
      localStorage.removeItem("activeDocId")
    }

    if (nextConversationId) {
      localStorage.setItem("activeConversationId", nextConversationId)
    } else {
      localStorage.removeItem("activeConversationId")
    }
  }

  const handleSelectDocument = (selectedDocId: string | null) => {
    setScopeState(selectedDocId, null)
  }

  const handleSelectWorkspace = () => {
    setScopeState(null, null)
  }

  const handleSelectConversation = (conversationId: string) => {
    const conversation = conversations.find((item) => item.id === conversationId)
    if (!conversation) {
      setScopeState(docId, conversationId)
      return
    }

    setScopeState(conversation.scope === "workspace" ? null : conversation.doc_id, conversation.id)
  }

  const handleConversationActivated = (conversation: Pick<ConversationSummary, "id" | "scope" | "doc_id">) => {
    setScopeState(conversation.scope === "workspace" ? null : conversation.doc_id, conversation.id)
  }

  const handleUpload = async (uploadedId: string | null) => {
    if (uploadedId) {
      setScopeState(uploadedId, null)
    } else {
      setScopeState(null, null)
    }
    await Promise.all([fetchDocuments(), fetchConversations()])
  }

  const handleDeleteDocument = async (deletedId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents/${deletedId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: localStorage.getItem("token") ? "omit" : "include",
      })
      if (!res.ok) throw new Error("Delete failed")

      setDocuments((prev) => prev.filter((doc) => doc.doc_id !== deletedId))
      if (activeConversationId === null && docId === deletedId) {
        setScopeState(null, null)
      }
      await fetchConversations()
    } catch {
      alert("Failed to delete document")
    }
  }

  const handleRenameConversation = async (conversationId: string, title: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/conversations/${conversationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(getAuthHeaders() ?? {}),
        },
        credentials: localStorage.getItem("token") ? "omit" : "include",
        body: JSON.stringify({ title }),
      })
      if (!res.ok) throw new Error("Rename failed")

      const updated = (await res.json()) as ConversationSummary
      setConversations((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
    } catch {
      alert("Failed to rename conversation")
    }
  }

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/conversations/${conversationId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: localStorage.getItem("token") ? "omit" : "include",
      })
      if (!res.ok) throw new Error("Delete failed")

      setConversations((prev) => prev.filter((item) => item.id !== conversationId))
      if (activeConversationId === conversationId) {
        localStorage.removeItem("activeConversationId")
        setActiveConversationId(null)
      }
    } catch {
      alert("Failed to delete conversation")
    }
  }

  useEffect(() => {
    if (status !== "authenticated") return

    const initialize = async () => {
      const [docs, chats] = await Promise.all([fetchDocuments(), fetchConversations()])
      const savedConversationId = localStorage.getItem("activeConversationId")
      const savedDocId = localStorage.getItem("activeDocId")

      if (savedConversationId) {
        const savedConversation = chats.find((conversation) => conversation.id === savedConversationId)
        if (savedConversation) {
          setDocId(savedConversation.scope === "workspace" ? null : savedConversation.doc_id)
          setActiveConversationId(savedConversation.id)
          return
        }
        localStorage.removeItem("activeConversationId")
      }

      if (savedDocId && docs.some((doc) => doc.doc_id === savedDocId)) {
        setDocId(savedDocId)
      } else {
        setDocId(null)
        localStorage.removeItem("activeDocId")
      }
      setActiveConversationId(null)
    }

    void initialize()
  }, [status])

  if (status === "loading") return null

  if (status === "unauthenticated") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <AuthDialog mode="signin" openByDefault />
      </div>
    )
  }

  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId) ?? null

  return (
    <div className="flex h-screen flex-col bg-background">
      <OnboardingTour
        key={tourKey}
        triggerKey={tourKey}
        onOpenApiKey={() => setApiKeyOpen(true)}
      />
      <DashboardNavbar
        documents={documents}
        conversations={conversations}
        loading={documentsLoading}
        conversationsLoading={conversationsLoading}
        onSelectDocument={handleSelectDocument}
        onSelectWorkspace={handleSelectWorkspace}
        onSelectConversation={handleSelectConversation}
        onStartNewChat={() => setScopeState(docId, null)}
        onUpload={handleUpload}
        onDeleteDocument={handleDeleteDocument}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
        activeDocId={docId}
        activeConversationId={activeConversationId}
        onTakeTour={() => {
          setApiKeyOpen(false)
          setTourKey((key) => key + 1)
        }}
      />

      <div className="flex min-h-0 flex-1">
        <aside className="hidden flex-shrink-0 border-r border-border/60 lg:flex lg:w-72 xl:w-80">
          <DashboardSidebar
            documents={documents}
            conversations={conversations}
            loading={documentsLoading}
            conversationsLoading={conversationsLoading}
            onSelectDocument={handleSelectDocument}
            onSelectWorkspace={handleSelectWorkspace}
            onSelectConversation={handleSelectConversation}
            onStartNewChat={() => setScopeState(docId, null)}
            onUpload={handleUpload}
            onDeleteDocument={handleDeleteDocument}
            onRenameConversation={handleRenameConversation}
            onDeleteConversation={handleDeleteConversation}
            activeDocId={docId}
            activeConversationId={activeConversationId}
            forceApiKeyOpen={apiKeyOpen}
          />
        </aside>

        <main className="relative flex min-w-0 flex-1 flex-col">
          {!docId && !activeConversationId && documents.length === 0 && !documentsLoading ? (
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <h2 className="mb-2 text-2xl font-bold">Welcome to EvidentiaAI</h2>
              <p className="mb-8 max-w-sm text-muted-foreground leading-relaxed">
                Upload a document to start chatting. Ask questions in plain English and get grounded answers instantly.
              </p>
              <UploadFAB
                onUpload={handleUpload}
                trigger={
                  <Button size="lg" className="h-11 gap-2 px-7 shadow-lg shadow-primary/20">
                    <Plus className="h-4 w-4" />
                    Upload your first document
                  </Button>
                }
              />
              <p className="mt-4 text-xs text-muted-foreground/60">PDF, TXT, MD, HTML · Max 10 MB</p>
            </div>
          ) : (
            <div className="relative flex flex-1 flex-col overflow-hidden">
              <ChatPanel
                docId={docId}
                activeConversationId={activeConversationId}
                activeConversation={activeConversation}
                onConversationActivated={handleConversationActivated}
                onConversationChanged={fetchConversations}
                onStartNewChat={() => setScopeState(docId, null)}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

