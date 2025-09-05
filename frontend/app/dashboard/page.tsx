"use client"

import { useState, useEffect } from "react"
import { DashboardNavbar } from "@/components/dashboard/navbar"
import UploadFAB from "@/components/ui/upload-fab"
import ChatPanel from "@/components/dashboard/chat-panel"
import DashboardSidebar, { type DocumentItem } from "@/components/dashboard/sidebar"
import { useAuth } from "@/lib/useAuth"
import AuthDialog from "@/components/ui/auth-dialog"

export default function Dashboard() {
  const [docId, setDocId] = useState<string | null>(null)
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const { status } = useAuth()

  // Save auth_type from cookie to localStorage
  useEffect(() => {
    const authTypeCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("auth_type="))
    if (authTypeCookie) {
      const value = authTypeCookie.split("=")[1]
      localStorage.setItem("auth_type", value)
    }
  }, [])

  // Called when a document is uploaded or selected
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

  // Called when a document is deleted
  const handleDelete = async (deletedId: string) => {
    const token = localStorage.getItem("token")

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents/${deletedId}`, {
        method: "DELETE",
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : undefined,
        credentials: token ? "omit" : "include",
      })

      if (res.ok) {
        const updatedDocs = documents.filter((doc) => doc.doc_id !== deletedId)
        setDocuments(updatedDocs)
        if (docId === deletedId) {
          setDocId(null)
          localStorage.removeItem("activeDocId")
        }
      }
    } catch {
      alert("Failed to delete document")
    }
  }

  // Fetch recent documents (support both token and cookie auth)
  const fetchDocuments = async () => {
    const token = localStorage.getItem("token")

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: token ? "omit" : "include", // OAuth users need cookie
      })

      if (res.ok) {
        const data = await res.json()
        setDocuments(data)
      } else {
        console.warn("Failed to fetch documents:", res.status)
      }
    } catch (err) {
      console.error("Error fetching documents:", err)
    }
  }

  // Load once on mount (for activeDocId), and when user is authenticated
  useEffect(() => {
    if (status === "authenticated") {
      fetchDocuments()
      const savedDocId = localStorage.getItem("activeDocId")
      if (savedDocId) setDocId(savedDocId)
    }
  }, [status])

  // Handle loading and unauthenticated state
  if (status === "loading") return null

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-muted/30 dark:bg-background/90 px-4">
        <AuthDialog mode="signin" openByDefault />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-muted/30 dark:bg-background/90">
      <DashboardNavbar
        documents={documents}
        onSelect={handleUpload}
        onDelete={handleDelete}
        activeDocId={docId}
      />

      <div className="flex flex-1 min-h-0 relative">
        <aside className="hidden lg:flex lg:w-80 flex-col border-r dark:border-zinc-800 bg-background">
          <DashboardSidebar
            documents={documents}
            onSelect={handleUpload}
            onDelete={handleDelete}
            activeDocId={docId}
          />
        </aside>

        <main className="flex-1 flex flex-col relative overflow-hidden">
          {!docId ? (
            <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
              <div className="max-w-md mx-auto space-y-4">
                <h2 className="text-2xl font-semibold text-muted-foreground">Welcome to KnowAI</h2>
                <p className="text-muted-foreground">
                  Upload a document to start chatting with your files. Use the upload button to get started.
                </p>
                <div className="text-sm text-muted-foreground/80">Supported formats: PDF, TXT, MD, HTML</div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-y-auto">
              <ChatPanel docId={docId} />
            </div>
          )}

          <div className="fixed bottom-4 right-4 z-30 lg:bottom-6 lg:right-6">
            <UploadFAB onUpload={handleUpload} />
          </div>
        </main>
      </div>
    </div>
  )
}
