"use client"

import { useEffect, useMemo, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import {
  Trash2,
  CheckCircle2,
  Loader2,
  XCircle,
  FileText,
  Plus,
  Key,
  ChevronDown,
  LibraryBig,
  MessagesSquare,
  Pencil,
  MessageSquarePlus,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { APIKeyManager } from "./api-key-manager"
import UploadFAB from "@/components/ui/upload-fab"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import type { ConversationSummary, DocumentItem } from "./types"

type PendingDelete =
  | { kind: "document"; id: string }
  | { kind: "conversation"; id: string }
  | null

export default function DashboardSidebar({
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
  forceApiKeyOpen = false,
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
  forceApiKeyOpen?: boolean
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    if (forceApiKeyOpen) setSettingsOpen(true)
  }, [forceApiKeyOpen])

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

  const doneDocuments = useMemo(
    () => documents.filter((doc) => doc.status === "done"),
    [documents]
  )

  const openDeleteConfirm = (kind: "document" | "conversation", id: string) => {
    setPendingDelete({ kind, id })
    setConfirmOpen(true)
  }

  const handleConfirmDelete = () => {
    if (!pendingDelete) return

    if (pendingDelete.kind === "document") {
      onDeleteDocument(pendingDelete.id)
    } else {
      onDeleteConversation(pendingDelete.id)
    }

    setConfirmOpen(false)
    setPendingDelete(null)
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
  }

  const promptRenameConversation = (conversation: ConversationSummary) => {
    const nextTitle = window.prompt("Rename conversation", conversation.title)?.trim()
    if (!nextTitle || nextTitle === conversation.title) return
    onRenameConversation(conversation.id, nextTitle)
  }

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex-shrink-0 px-3 pt-3 pb-2">
        <UploadFAB
          onUpload={onUpload}
          trigger={
            <Button className="h-10 w-full gap-2 font-medium shadow-sm shadow-primary/20" variant="default">
              <Plus className="h-4 w-4" />
              New Document
            </Button>
          }
        />
      </div>

      <div className="flex-shrink-0 border-b border-sidebar-border/70 px-3 pb-3">
        <Button
          variant="outline"
          onClick={onStartNewChat}
          className="h-10 w-full justify-start gap-2 rounded-xl border-border/70 bg-background/60"
        >
          <MessageSquarePlus className="h-4 w-4" />
          Start new chat
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full w-full [&_[data-slot=scroll-area-viewport]]:overflow-x-hidden">
          <div className="flex min-w-0 flex-col gap-4 px-3 py-3">
            <section>
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Recent Chats
                </span>
                {!conversationsLoading && conversations.length > 0 && (
                  <span className="rounded-full bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
                    {conversations.length}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                {conversationsLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={`conversation-skeleton-${index}`} className="rounded-xl px-3 py-2.5">
                      <Skeleton className="h-4 w-[78%]" />
                      <Skeleton className="mt-2 h-3 w-20" />
                    </div>
                  ))
                ) : conversations.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/60 px-4 py-5 text-sm text-muted-foreground">
                    Your saved chats will show up here.
                  </div>
                ) : (
                  conversations.map((conversation) => {
                    const isActive = activeConversationId === conversation.id
                    return (
                      <div
                        key={conversation.id}
                        onClick={() => onSelectConversation(conversation.id)}
                        className={cn(
                          "group grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2 rounded-xl pl-2.5 pr-0.5 py-2.5 transition-all duration-150",
                          isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50"
                        )}
                      >
                        <div className="mt-0.5">
                          <MessagesSquare className={cn("h-3.5 w-3.5", isActive ? "text-primary" : "text-muted-foreground/70")} />
                        </div>

                        <div className="min-w-0 overflow-hidden">
                          <p className="truncate text-sm font-medium leading-snug" title={conversation.title}>
                            {conversation.title}
                          </p>
                          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground/70">
                            <span
                              className={cn(
                                "rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                conversation.scope === "workspace"
                                  ? "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-300"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                              )}
                            >
                              {conversation.scope === "workspace" ? "Workspace" : "Document"}
                            </span>
                            <span>{formatDate(conversation.updated_at)}</span>
                          </div>
                          {conversation.document_deleted && (
                            <p className="mt-1 text-xs text-destructive">Document removed</p>
                          )}
                        </div>

                        <div className="flex items-center gap-0.5 self-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(event) => {
                              event.stopPropagation()
                              promptRenameConversation(conversation)
                            }}
                            className={cn(
                              "h-7 w-7 rounded-lg text-muted-foreground/70 transition-all hover:bg-accent hover:text-foreground",
                              "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100",
                              isActive && "md:opacity-100"
                            )}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(event) => {
                              event.stopPropagation()
                              openDeleteConfirm("conversation", conversation.id)
                            }}
                            className={cn(
                              "h-7 w-7 rounded-lg text-muted-foreground/70 transition-all hover:bg-destructive/8 hover:text-destructive",
                              "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100",
                              isActive && "md:opacity-100"
                            )}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Documents
                </span>
                {!loading && documents.length > 0 && (
                  <span className="rounded-full bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
                    {documents.length}
                  </span>
                )}
              </div>

              <div id="tour-workspace" className="mb-1 flex items-center justify-between rounded-xl px-2.5 py-2">
                <div className="flex items-center gap-2">
                  <LibraryBig className={cn("h-3.5 w-3.5 shrink-0", activeDocId === null ? "text-primary" : "text-muted-foreground/60")} />
                  <span className={cn("text-sm font-medium", activeDocId === null ? "text-foreground" : "text-muted-foreground")}>
                    All Documents
                  </span>
                </div>
                <Switch
                  checked={activeDocId === null}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onSelectWorkspace()
                    } else {
                      const firstDone = doneDocuments[0]
                      onSelectDocument(firstDone?.doc_id ?? null)
                    }
                  }}
                />
              </div>

              <div id="tour-doclist" className="space-y-0.5">
                {loading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={`doc-skeleton-${index}`}
                      className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2 rounded-xl pl-2.5 pr-0.5 py-2.5"
                    >
                      <Skeleton className="mt-0.5 h-3.5 w-3.5 rounded-full" />
                      <div className="min-w-0 overflow-hidden">
                        <Skeleton className="h-4 w-[78%]" />
                        <Skeleton className="mt-2 h-3 w-16" />
                      </div>
                      <Skeleton className="h-7 w-7 self-center rounded-lg" />
                    </div>
                  ))
                ) : documents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                      <FileText className="h-5 w-5 text-muted-foreground/60" />
                    </div>
                    <p className="mb-1 text-sm font-medium text-muted-foreground">No documents yet</p>
                    <p className="text-xs text-muted-foreground/70">Upload your first document above to get started</p>
                  </div>
                ) : (
                  documents.map((doc) => {
                    const isActive = activeConversationId === null && activeDocId === doc.doc_id
                    return (
                      <div
                        key={doc.doc_id}
                        onClick={() => doc.status === "done" && onSelectDocument(doc.doc_id)}
                        className={cn(
                          "group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2 rounded-xl pl-2.5 pr-0.5 py-2.5 transition-all duration-150",
                          doc.status === "done" ? "cursor-pointer" : "cursor-default",
                          isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50"
                        )}
                      >
                        <div className="mt-0.5">
                          {doc.status === "done" ? (
                            <CheckCircle2 className={cn("h-3.5 w-3.5", isActive ? "text-primary" : "text-green-500")} />
                          ) : doc.status === "failed" ? (
                            <XCircle className="h-3.5 w-3.5 text-destructive" />
                          ) : (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
                          )}
                        </div>

                        <div className="min-w-0 overflow-hidden">
                          <p className="truncate text-sm font-medium leading-snug" title={doc.filename}>
                            {doc.filename}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground/70">
                            {doc.status === "processing"
                              ? "Processing..."
                              : doc.status === "failed"
                                ? "Failed"
                                : formatDate(doc.upload_time)}
                          </p>
                        </div>

                        <div className="flex w-5 self-center items-center justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(event) => {
                              event.stopPropagation()
                              openDeleteConfirm("document", doc.doc_id)
                            }}
                            className={cn(
                              "h-7 w-7 rounded-lg text-muted-foreground/70 transition-all hover:bg-destructive/8 hover:text-destructive",
                              "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100",
                              isActive && "md:opacity-100"
                            )}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </section>
          </div>
        </ScrollArea>
      </div>

      <div id="tour-apikey" className="flex-shrink-0 border-t border-sidebar-border">
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 transition-colors hover:text-muted-foreground"
        >
          <span className="flex items-center gap-2">
            <Key className="h-3.5 w-3.5" />
            API Key
          </span>
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", settingsOpen && "rotate-180")} />
        </button>
        {settingsOpen && (
          <div className="px-3 pb-3">
            <APIKeyManager apiBase={apiBase} />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={pendingDelete?.kind === "conversation" ? "Delete conversation" : "Delete document"}
        description={
          pendingDelete?.kind === "conversation"
            ? "This conversation history will be removed permanently."
            : "This will permanently delete the document and all its data. This action cannot be undone."
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setConfirmOpen(false)
          setPendingDelete(null)
        }}
      />
    </div>
  )
}

