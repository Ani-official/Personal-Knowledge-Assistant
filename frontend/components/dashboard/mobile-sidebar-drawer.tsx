"use client"

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { DialogTitle } from "@/components/ui/dialog"
import { Menu } from "lucide-react"
import DashboardSidebar from "@/components/dashboard/sidebar"
import type { ConversationSummary, DocumentItem } from "@/components/dashboard/types"
import { useState } from "react"

export default function MobileSidebarDrawer({
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
}) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Menu className="w-5 h-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 sm:w-80">
        <div className="flex h-14 items-center border-b border-border/60 px-4">
          <DialogTitle className="text-base font-bold">EvidentiaAI</DialogTitle>
        </div>
        <div className="h-[calc(100%-3.5rem)]">
          <DashboardSidebar
            documents={documents}
            conversations={conversations}
            loading={loading}
            conversationsLoading={conversationsLoading}
            onSelectDocument={(docId) => {
              onSelectDocument(docId)
              setOpen(false)
            }}
            onSelectWorkspace={() => {
              onSelectWorkspace()
              setOpen(false)
            }}
            onSelectConversation={(conversationId) => {
              onSelectConversation(conversationId)
              setOpen(false)
            }}
            onStartNewChat={() => {
              onStartNewChat()
              setOpen(false)
            }}
            onUpload={onUpload}
            onDeleteDocument={onDeleteDocument}
            onRenameConversation={onRenameConversation}
            onDeleteConversation={onDeleteConversation}
            activeDocId={activeDocId}
            activeConversationId={activeConversationId}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}

