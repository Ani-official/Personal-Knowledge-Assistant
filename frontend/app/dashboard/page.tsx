"use client"

import { useState, useEffect } from "react"
import { DashboardNavbar } from "@/components/dashboard/navbar"
import ChatPanel from "@/components/dashboard/chat-panel"
import DashboardSidebar from "@/components/dashboard/sidebar"
import type { ConversationSummary, DocumentItem, Source } from "@/components/dashboard/types"
import DocumentReader, { type ReaderTarget } from "@/components/dashboard/document-reader"
import { useAuth } from "@/lib/useAuth"
import { Bot, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import UploadFAB from "@/components/ui/upload-fab"
import { Button } from "@/components/ui/button"
import OnboardingTour from "@/components/dashboard/onboarding-tour"
import { apiFetch, apiJson } from "@/lib/api"
import { reportError } from "@/lib/error-dialog"

export default function Dashboard() {
  const [docId, setDocId] = useState<string | null>(null)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(true)
  const [conversationsLoading, setConversationsLoading] = useState(true)
  const [tourKey, setTourKey] = useState(0)
  const [apiKeyOpen, setApiKeyOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [readerTarget, setReaderTarget] = useState<ReaderTarget | null>(null)
  const { status, email } = useAuth({ required: true })

  const fetchDocuments = async () => {
    setDocumentsLoading(true)
    try {
      const data = await apiJson<DocumentItem[]>("/documents/")
      setDocuments(data)
      return data
    } catch (err) {
      reportError(err, { title: "Couldn't load documents", message: "Your documents couldn't be loaded. Refresh to try again." })
    } finally {
      setDocumentsLoading(false)
    }
    return [] as DocumentItem[]
  }

  const fetchConversations = async () => {
    setConversationsLoading(true)
    try {
      const data = await apiJson<ConversationSummary[]>("/conversations/")
      setConversations(data)
      return data
    } catch (err) {
      reportError(err, {
        title: "Couldn't load conversations",
        message: "Your conversations couldn't be loaded. Refresh to try again.",
      })
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
    setReaderTarget(null)
    setScopeState(selectedDocId, null)
  }

  const handleSelectWorkspace = () => {
    setReaderTarget(null)
    setScopeState(null, null)
  }

  const handleSelectConversation = (conversationId: string) => {
    setReaderTarget(null)
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
      await apiFetch(`/documents/${deletedId}`, { method: "DELETE" })

      setDocuments((prev) => prev.filter((doc) => doc.doc_id !== deletedId))
      if (activeConversationId === null && docId === deletedId) {
        setScopeState(null, null)
      }
      await fetchConversations()
    } catch (err) {
      reportError(err, { title: "Couldn't delete document", message: "The document couldn't be deleted. Please try again." })
    }
  }

  const handleRenameConversation = async (conversationId: string, title: string) => {
    try {
      const updated = await apiJson<ConversationSummary>(`/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      })
      setConversations((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
    } catch (err) {
      reportError(err, { title: "Couldn't rename conversation", message: "The conversation couldn't be renamed. Please try again." })
    }
  }

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await apiFetch(`/conversations/${conversationId}`, { method: "DELETE" })

      setConversations((prev) => prev.filter((item) => item.id !== conversationId))
      if (activeConversationId === conversationId) {
        localStorage.removeItem("activeConversationId")
        setActiveConversationId(null)
      }
    } catch (err) {
      reportError(err, { title: "Couldn't delete conversation", message: "The conversation couldn't be deleted. Please try again." })
    }
  }

  useEffect(() => {
    setSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "1")
  }, [])

  const handleOpenSource = (source: Source) => {
    if (!source.page) return
    setReaderTarget({ docId: source.doc_id, page: source.page, highlight: source.text })
  }

  const applySidebarCollapsed = (next: boolean) => {
    setSidebarCollapsed(next)
    localStorage.setItem("sidebarCollapsed", next ? "1" : "0")
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

  // Signed-out visitors are sent to /login and ended sessions to the
  // session-expired screen by useAuth; render nothing while that happens.
  if (status !== "authenticated") return null

  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId) ?? null

  return (
    <div className="flex h-screen bg-background">
      <OnboardingTour
        key={tourKey}
        triggerKey={tourKey}
        onOpenApiKey={() => {
          applySidebarCollapsed(false)
          setApiKeyOpen(true)
        }}
      />

      <aside
        className={cn(
          "hidden shrink-0 border-r border-border/60 transition-[width] duration-200 ease-out lg:flex",
          sidebarCollapsed ? "w-[60px]" : "w-72 xl:w-80"
        )}
      >
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
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => applySidebarCollapsed(!sidebarCollapsed)}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
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
          userEmail={email}
          readerOpen={readerTarget !== null}
          onCloseReader={() => setReaderTarget(null)}
          onTakeTour={() => {
            setApiKeyOpen(false)
            setTourKey((key) => key + 1)
          }}
        />

        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col">
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
            <div className="flex min-h-0 flex-1">
              <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <ChatPanel
                  docId={docId}
                  documentName={documents.find((doc) => doc.doc_id === docId)?.filename ?? null}
                  onUpload={handleUpload}
                  activeConversationId={activeConversationId}
                  activeConversation={activeConversation}
                  onConversationActivated={handleConversationActivated}
                  onConversationChanged={fetchConversations}
                  onOpenSource={handleOpenSource}
                />
              </div>

              {readerTarget && (
                <div className="hidden min-h-0 w-[46%] min-w-0 max-w-[620px] md:flex">
                  <DocumentReader
                    target={readerTarget}
                    onClose={() => setReaderTarget(null)}
                    onNavigate={(page) =>
                      setReaderTarget((current) =>
                        current ? { ...current, page, highlight: undefined } : current
                      )
                    }
                  />
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
