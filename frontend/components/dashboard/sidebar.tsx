"use client"

import { useEffect, useMemo, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Trash2,
  FileText,
  Plus,
  Key,
  ChevronDown,
  MessagesSquare,
  Pencil,
  PanelLeft,
  Search,
  Upload,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { APIKeyManager, readApiKeyStatus, type KeyStatus } from "./api-key-manager"
import UploadFAB from "@/components/ui/upload-fab"
import { Skeleton } from "@/components/ui/skeleton"
import { BrandLockup, BrandMark } from "./brand-mark"
import type { ConversationSummary, DocumentItem } from "./types"

type PendingDelete =
  | { kind: "document"; id: string }
  | { kind: "conversation"; id: string }
  | null

const KEY_BADGE: Record<KeyStatus, { label: string; className: string }> = {
  linked: { label: "Connected", className: "bg-primary/10 text-primary" },
  local: { label: "Local", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  none: { label: "Not set", className: "bg-muted text-muted-foreground" },
}

/** Compact age for list rows: "Today", "3d", then a plain date. */
function shortAge(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return "Today"
  if (days < 30) return `${days}d`
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

/** Longer age for the document meta line: "5 days ago". */
function longAge(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 30) return `${days} days ago`
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

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
  collapsed = false,
  onToggleCollapse,
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
  /** Render the narrow icon rail instead of the full panel. */
  collapsed?: boolean
  /** Omit to hide the collapse control (mobile drawer). */
  onToggleCollapse?: () => void
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [keyStatus, setKeyStatus] = useState<KeyStatus>("none")
  const [query, setQuery] = useState("")

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

  useEffect(() => {
    if (forceApiKeyOpen) setSettingsOpen(true)
  }, [forceApiKeyOpen])

  useEffect(() => {
    let cancelled = false
    void readApiKeyStatus(apiBase).then((status) => {
      if (!cancelled) setKeyStatus(status)
    })
    return () => {
      cancelled = true
    }
  }, [apiBase])

  const needle = query.trim().toLowerCase()

  const visibleConversations = useMemo(
    () =>
      needle
        ? conversations.filter((conversation) => conversation.title.toLowerCase().includes(needle))
        : conversations,
    [conversations, needle]
  )

  const visibleDocuments = useMemo(
    () => (needle ? documents.filter((doc) => doc.filename.toLowerCase().includes(needle)) : documents),
    [documents, needle]
  )

  const processingCount = documents.filter((doc) => doc.status === "processing").length

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

  const promptRenameConversation = (conversation: ConversationSummary) => {
    const nextTitle = window.prompt("Rename conversation", conversation.title)?.trim()
    if (!nextTitle || nextTitle === conversation.title) return
    onRenameConversation(conversation.id, nextTitle)
  }

  const confirmDialog = (
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
  )

  // ---------------------------------------------------------------- rail
  if (collapsed) {
    return (
      <div className="flex h-full w-full flex-col items-center gap-1 bg-sidebar py-3 text-sidebar-foreground">
        <button
          onClick={onToggleCollapse}
          title="Expand sidebar"
          className="group relative flex size-9 items-center justify-center rounded-xl transition-colors hover:bg-sidebar-accent/60"
        >
          <BrandMark className="size-9 rounded-xl text-sm transition-opacity group-hover:opacity-0" />
          <PanelLeft className="absolute size-4 opacity-0 transition-opacity group-hover:opacity-100" />
          <span className="sr-only">Expand sidebar</span>
        </button>

        <div className="my-1.5 h-px w-7 bg-sidebar-border" />

        <div className="flex flex-col items-center gap-1">
          <UploadFAB
            onUpload={onUpload}
            trigger={
              <Button id="tour-upload" size="icon" className="size-9 rounded-xl shadow-sm shadow-primary/20" title="Upload document">
                <Upload className="size-4" />
                <span className="sr-only">Upload document</span>
              </Button>
            }
          />

          <Button
            variant="ghost"
            size="icon"
            onClick={onStartNewChat}
            title="New chat"
            className="size-9 rounded-xl text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
          >
            <Plus className="size-4" />
            <span className="sr-only">New chat</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            title="Search chats"
            className="size-9 rounded-xl text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
          >
            <Search className="size-4" />
            <span className="sr-only">Search chats</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            title={`${documents.length} document${documents.length === 1 ? "" : "s"}`}
            className="relative size-9 rounded-xl text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
          >
            <FileText className="size-4" />
            {processingCount > 0 && (
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-amber-500" />
            )}
            <span className="sr-only">Documents</span>
          </Button>
        </div>

        <div className="mt-auto">
          <Button
            id="tour-apikey"
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            title={`API key — ${KEY_BADGE[keyStatus].label}`}
            className="relative size-9 rounded-xl text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
          >
            <Key className="size-4" />
            {keyStatus === "linked" && (
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" />
            )}
            <span className="sr-only">API key</span>
          </Button>
        </div>

        {confirmDialog}
      </div>
    )
  }

  // ------------------------------------------------------------ full panel
  return (
    <div className="flex h-full w-full min-w-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 flex-shrink-0 items-center justify-between gap-2 px-3">
        <BrandLockup />
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            title="Collapse sidebar"
            className="size-8 rounded-lg text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
          >
            <PanelLeft className="size-4" />
            <span className="sr-only">Collapse sidebar</span>
          </Button>
        )}
      </div>

      <div className="flex-shrink-0 space-y-2 px-3 pb-3">
        <div className="flex items-center gap-2">
          <UploadFAB
            onUpload={onUpload}
            trigger={
              <Button id="tour-upload" className="h-9 flex-1 text-[13px] font-semibold shadow-sm shadow-primary/20">
                Upload document
              </Button>
            }
          />
          <Button
            variant="outline"
            size="icon"
            onClick={onStartNewChat}
            title="New chat"
            className="size-9 shrink-0 rounded-lg border-border/70 bg-background/60 text-muted-foreground hover:text-foreground"
          >
            <Plus className="size-4" />
            <span className="sr-only">New chat</span>
          </Button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search chats"
            className="h-9 rounded-lg border-border/70 bg-background/60 pl-8 text-[13px]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full w-full [&_[data-slot=scroll-area-viewport]]:overflow-x-hidden">
          <div className="flex min-w-0 flex-col gap-5 px-3 pb-4">
            <section>
              <div className="mb-1.5 flex items-center justify-between px-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">
                  Chats
                </span>
                {!conversationsLoading && conversations.length > 0 && (
                  <span className="text-[11px] tabular-nums text-muted-foreground/60">
                    {visibleConversations.length}
                  </span>
                )}
              </div>

              <div className="space-y-px">
                {conversationsLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={`conversation-skeleton-${index}`} className="px-2 py-2">
                      <Skeleton className="h-3.5 w-[70%]" />
                    </div>
                  ))
                ) : visibleConversations.length === 0 ? (
                  <p className="px-2 py-2 text-[13px] text-muted-foreground/70">
                    {needle ? "No chats match your search." : "Your saved chats will show up here."}
                  </p>
                ) : (
                  visibleConversations.map((conversation) => {
                    const isActive = activeConversationId === conversation.id
                    return (
                      <div
                        key={conversation.id}
                        onClick={() => onSelectConversation(conversation.id)}
                        title={conversation.title}
                        className={cn(
                          "group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors",
                          isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50"
                        )}
                      >
                        <span className="min-w-0 flex-1 truncate text-[13px] leading-6">
                          {conversation.title}
                        </span>

                        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground/60 group-hover:hidden">
                          {shortAge(conversation.updated_at)}
                        </span>

                        <span className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
                          <button
                            onClick={(event) => {
                              event.stopPropagation()
                              promptRenameConversation(conversation)
                            }}
                            title="Rename chat"
                            className="rounded p-1 text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            onClick={(event) => {
                              event.stopPropagation()
                              openDeleteConfirm("conversation", conversation.id)
                            }}
                            title="Delete chat"
                            className="rounded p-1 text-muted-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            </section>

            <section>
              <div className="mb-1.5 flex items-center justify-between px-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">
                  Documents
                </span>
                {!loading && documents.length > 0 && (
                  <span className="text-[11px] tabular-nums text-muted-foreground/60">
                    {visibleDocuments.length}
                  </span>
                )}
              </div>

              <div id="tour-doclist" className="space-y-1">
                {loading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={`doc-skeleton-${index}`} className="rounded-lg border border-border/60 px-3 py-2.5">
                      <Skeleton className="h-3.5 w-[70%]" />
                      <Skeleton className="mt-2 h-3 w-24" />
                    </div>
                  ))
                ) : documents.length === 0 ? (
                  <p className="px-2 py-2 text-[13px] text-muted-foreground/70">
                    Upload a document to get started.
                  </p>
                ) : visibleDocuments.length === 0 ? (
                  <p className="px-2 py-2 text-[13px] text-muted-foreground/70">
                    No documents match your search.
                  </p>
                ) : (
                  visibleDocuments.map((doc) => {
                    const isActive = activeConversationId === null && activeDocId === doc.doc_id
                    return (
                      <div
                        key={doc.doc_id}
                        onClick={() => doc.status === "done" && onSelectDocument(doc.doc_id)}
                        className={cn(
                          "group flex items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors",
                          doc.status === "done" ? "cursor-pointer" : "cursor-default",
                          isActive
                            ? "border-primary/40 bg-sidebar-accent"
                            : "border-border/60 bg-background/40 hover:border-border hover:bg-background/70"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-1.5 size-1.5 shrink-0 rounded-full",
                            doc.status === "done" && "bg-primary",
                            doc.status === "failed" && "bg-destructive",
                            doc.status === "processing" && "animate-pulse bg-amber-500"
                          )}
                        />

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium leading-5" title={doc.filename}>
                            {doc.filename}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                            {doc.status === "processing"
                              ? "Indexing…"
                              : doc.status === "failed"
                                ? "Failed to index"
                                : `Indexed · ${longAge(doc.upload_time)}`}
                          </p>
                        </div>

                        <button
                          onClick={(event) => {
                            event.stopPropagation()
                            openDeleteConfirm("document", doc.doc_id)
                          }}
                          title="Delete document"
                          className="rounded p-1 text-muted-foreground/60 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    )
                  })
                )}
              </div>

              <button
                id="tour-workspace"
                onClick={onSelectWorkspace}
                className={cn(
                  "mt-2 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] transition-colors",
                  activeDocId === null
                    ? "font-medium text-primary"
                    : "text-primary/80 hover:bg-sidebar-accent/50 hover:text-primary"
                )}
              >
                <MessagesSquare className="size-3.5 shrink-0" />
                Search across all documents
              </button>
            </section>
          </div>
        </ScrollArea>
      </div>

      <div id="tour-apikey" className="flex-shrink-0 border-t border-sidebar-border">
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="flex items-center gap-2">
            <Key className="size-3.5" />
            API key
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                KEY_BADGE[keyStatus].className
              )}
            >
              {KEY_BADGE[keyStatus].label}
            </span>
            <ChevronDown className={cn("size-3.5 transition-transform", settingsOpen && "rotate-180")} />
          </span>
        </button>
        {settingsOpen && (
          <div className="max-h-[50vh] overflow-y-auto px-3 pb-3">
            <APIKeyManager apiBase={apiBase} onStatusChange={setKeyStatus} />
          </div>
        )}
      </div>

      {confirmDialog}
    </div>
  )
}
