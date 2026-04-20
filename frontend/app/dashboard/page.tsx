"use client"

import { useState, useEffect } from "react"
import { DashboardNavbar } from "@/components/dashboard/navbar"
import ChatPanel from "@/components/dashboard/chat-panel"
import DashboardSidebar, { type DocumentItem } from "@/components/dashboard/sidebar"
import { useAuth } from "@/lib/useAuth"
import AuthDialog from "@/components/ui/auth-dialog"
import { Bot, Plus } from "lucide-react"
import UploadFAB from "@/components/ui/upload-fab"
import { Button } from "@/components/ui/button"
import OnboardingTour from "@/components/dashboard/onboarding-tour"

export default function Dashboard() {
  const [docId, setDocId] = useState<string | null>(null)
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(true)
  const [tourKey, setTourKey] = useState(0)
  const [apiKeyOpen, setApiKeyOpen] = useState(false)
  const { status } = useAuth()

  const handleUpload = (uploadedId: string | null) => {
    if (uploadedId) {
      localStorage.setItem("activeDocId", uploadedId)
      setDocId(uploadedId)
    } else {
      localStorage.removeItem("activeDocId")
      setDocId(null)
    }
    fetchDocuments()
  }

  const handleDelete = async (deletedId: string) => {
    const token = localStorage.getItem("token")
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents/${deletedId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: token ? "omit" : "include",
      })
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.doc_id !== deletedId))
        if (docId === deletedId) {
          setDocId(null)
          localStorage.removeItem("activeDocId")
        }
      }
    } catch {
      alert("Failed to delete document")
    }
  }

  const fetchDocuments = async () => {
    const token = localStorage.getItem("token")
    setDocumentsLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: token ? "omit" : "include",
      })
      if (res.ok) {
        const data = await res.json()
        setDocuments(data)
      }
    } catch (err) {
      console.error("Error fetching documents:", err)
    } finally {
      setDocumentsLoading(false)
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      fetchDocuments()
      const savedDocId = localStorage.getItem("activeDocId")
      if (savedDocId) setDocId(savedDocId)
    }
  }, [status])

  if (status === "loading") return null

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
        <AuthDialog mode="signin" openByDefault />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <OnboardingTour
        key={tourKey}
        triggerKey={tourKey}
        onOpenApiKey={() => setApiKeyOpen(true)}
      />
      <DashboardNavbar
        documents={documents}
        loading={documentsLoading}
        onSelect={handleUpload}
        onUpload={handleUpload}
        onDelete={handleDelete}
        activeDocId={docId}
        onTakeTour={() => { setApiKeyOpen(false); setTourKey(k => k + 1) }}
      />

      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:w-72 xl:w-80 flex-col border-r border-border/60 flex-shrink-0">
          <DashboardSidebar
            documents={documents}
            loading={documentsLoading}
            onSelect={handleUpload}
            onUpload={handleUpload}
            onDelete={handleDelete}
            activeDocId={docId}
            forceApiKeyOpen={apiKeyOpen}
          />
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col min-w-0 relative">
          {!docId && documents.length === 0 && !documentsLoading ? (
            /* No documents at all — first-time upload empty state */
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-5">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Welcome to EvidentiaAI</h2>
              <p className="text-muted-foreground max-w-sm mb-8 leading-relaxed">
                Upload a document to start chatting. Ask questions in plain English — get precise answers instantly.
              </p>
              <UploadFAB
                onUpload={handleUpload}
                trigger={
                  <Button size="lg" className="h-11 px-7 gap-2 shadow-lg shadow-primary/20">
                    <Plus className="w-4 h-4" />
                    Upload your first document
                  </Button>
                }
              />
              <p className="mt-4 text-xs text-muted-foreground/60">
                PDF, TXT, MD, HTML · Max 10 MB
              </p>
            </div>
          ) : (
            /* Chat area — docId=null means workspace mode, string means single-doc mode */
            <div className="flex-1 flex flex-col overflow-hidden relative">
              <ChatPanel docId={docId} />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
