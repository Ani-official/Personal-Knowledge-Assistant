"use client"

import { Button } from "@/components/ui/button"
import { Moon, Sun, LogOut, FileText, BookOpen, MessagesSquare } from "lucide-react"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import MobileSidebarDrawer from "@/components/dashboard/mobile-sidebar-drawer"
import type { ConversationSummary, DocumentItem } from "./types"
import { resetOnboarding } from "@/components/dashboard/onboarding-tour"

export function DashboardNavbar({
  documents,
  conversations,
  loading = false,
  conversationsLoading = false,
  onSelectDocument,
  onSelectWorkspace,
  onSelectConversation,
  onStartNewChat,
  onUpload,
  onDeleteDocument,
  onRenameConversation,
  onDeleteConversation,
  activeDocId,
  activeConversationId,
  onTakeTour,
}: {
  documents: DocumentItem[]
  conversations: ConversationSummary[]
  loading?: boolean
  conversationsLoading?: boolean
  onSelectDocument: (docId: string | null) => void
  onSelectWorkspace: () => void
  onSelectConversation: (conversationId: string) => void
  onStartNewChat: () => void
  onUpload: (docId: string) => void
  onDeleteDocument: (docId: string) => void
  onRenameConversation: (conversationId: string, title: string) => void
  onDeleteConversation: (conversationId: string) => void
  activeDocId: string | null
  activeConversationId: string | null
  onTakeTour?: () => void
}) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleTakeTour = () => {
    resetOnboarding()
    onTakeTour?.()
  }

  const activeDoc = documents.find((d) => d.doc_id === activeDocId)
  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId)

  const handleLogout = async () => {
    const authType = localStorage.getItem("auth_type")
    if (authType === "google") {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
          method: "GET",
          credentials: "include",
        })
      } catch {}
    }
    localStorage.removeItem("token")
    localStorage.removeItem("auth_type")
    localStorage.removeItem("activeDocId")
    localStorage.removeItem("activeConversationId")
    router.push("/")
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/60 bg-background/95 px-3 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80 sm:px-4">
      <div className="flex items-center gap-2">
        <div className="lg:hidden">
          <MobileSidebarDrawer
            documents={documents}
            conversations={conversations}
            loading={loading}
            conversationsLoading={conversationsLoading}
            onSelectDocument={onSelectDocument}
            onSelectWorkspace={onSelectWorkspace}
            onSelectConversation={onSelectConversation}
            onStartNewChat={onStartNewChat}
            onUpload={onUpload}
            onDeleteDocument={onDeleteDocument}
            onRenameConversation={onRenameConversation}
            onDeleteConversation={onDeleteConversation}
            activeDocId={activeDocId}
            activeConversationId={activeConversationId}
          />
        </div>
        <span className="hidden text-lg font-bold sm:block">EvidentiaAI</span>
      </div>

      {activeConversation ? (
        <div className="hidden max-w-xs items-center gap-2 truncate text-sm text-muted-foreground sm:flex">
          <MessagesSquare className="h-3.5 w-3.5 flex-shrink-0 text-primary/70" />
          <span className="truncate">{activeConversation.title}</span>
        </div>
      ) : activeDoc ? (
        <div className="hidden max-w-xs items-center gap-2 truncate text-sm text-muted-foreground sm:flex">
          <FileText className="h-3.5 w-3.5 flex-shrink-0 text-primary/70" />
          <span className="truncate">{activeDoc.filename}</span>
        </div>
      ) : null}

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleTakeTour}
          className="hidden h-8 gap-1.5 px-3 text-muted-foreground hover:text-foreground sm:flex"
        >
          <BookOpen className="h-4 w-4" />
          <span className="text-sm">Tour</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="h-8 w-8 text-muted-foreground"
        >
          {mounted && (theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />)}
          <span className="sr-only">Toggle theme</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground sm:px-3"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden text-sm sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  )
}

