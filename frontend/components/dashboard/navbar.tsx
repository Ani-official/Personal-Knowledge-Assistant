"use client"

import { FileText, HelpCircle, LibraryBig, MessagesSquare } from "lucide-react"
import { useState, useEffect } from "react"
import MobileSidebarDrawer from "@/components/dashboard/mobile-sidebar-drawer"
import UserMenu from "@/components/dashboard/user-menu"
import type { ConversationSummary, DocumentItem } from "./types"
import { resetOnboarding } from "@/components/dashboard/onboarding-tour"
import { cn } from "@/lib/utils"

function StatusPill({ status }: { status: string }) {
  const label = status === "done" ? "Indexed" : status === "failed" ? "Failed" : "Processing"
  return (
    <span
      className={cn(
        "hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium sm:inline",
        status === "done" && "bg-primary/10 text-primary",
        status === "failed" && "bg-destructive/10 text-destructive",
        status !== "done" && status !== "failed" && "bg-amber-500/10 text-amber-600 dark:text-amber-400"
      )}
    >
      {label}
    </span>
  )
}

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
  userEmail,
  readerOpen = false,
  onCloseReader,
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
  userEmail: string | null
  readerOpen?: boolean
  onCloseReader?: () => void
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleTakeTour = () => {
    resetOnboarding()
    onTakeTour?.()
  }

  const activeDoc = documents.find((d) => d.doc_id === activeDocId)
  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId)

  // The centre of the bar always names the scope you are chatting with — the
  // only piece of context that survives collapsing the sidebar.
  const scopePill = activeConversation ? (
    <>
      <MessagesSquare className="size-3.5 shrink-0 text-primary/70" />
      <span className="truncate font-medium">{activeConversation.title}</span>
      <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
        {activeConversation.scope === "workspace" ? "All documents" : activeConversation.document_filename}
      </span>
    </>
  ) : activeDoc ? (
    <>
      <FileText className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate font-medium">{activeDoc.filename}</span>
      <StatusPill status={activeDoc.status} />
    </>
  ) : (
    <>
      <LibraryBig className="size-3.5 shrink-0 text-primary/70" />
      <span className="truncate font-medium">All documents</span>
      <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
        {documents.length} indexed
      </span>
    </>
  )

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border/60 bg-background/95 px-3 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80 sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-1">
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

      </div>

      <div className="flex min-w-0 shrink items-center gap-2">
        <div className="flex min-w-0 max-w-[420px] shrink items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-sm shadow-sm">
          {scopePill}
        </div>

        {readerOpen && onCloseReader && (
          <div className="hidden shrink-0 items-center rounded-full border border-border/60 bg-card/70 p-0.5 text-xs shadow-sm md:flex">
            <button
              onClick={onCloseReader}
              className="rounded-full px-2.5 py-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              Chat
            </button>
            <span className="rounded-full bg-primary px-2.5 py-1 font-medium text-primary-foreground">
              Split
            </span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-1">
        <button
          onClick={handleTakeTour}
          title="Take the tour"
          className="flex size-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        >
          <HelpCircle className="size-[18px]" strokeWidth={1.75} />
          <span className="sr-only">Take the tour</span>
        </button>

        <UserMenu email={userEmail} mounted={mounted} />
      </div>
    </header>
  )
}
