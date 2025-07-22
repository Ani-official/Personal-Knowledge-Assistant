"use client"

import { useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Trash2, CheckCircle2, Loader2, History, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { APIKeyManager } from "./api-key-manager"

export type DocumentItem = {
  doc_id: string
  filename: string
  status: string
  upload_time: string
}

export default function DashboardSidebar({
  documents,
  onSelect,
  onDelete,
  activeDocId,
}: {
  documents: DocumentItem[]
  onSelect: (docId: string | null) => void
  onDelete: (docId: string) => void
  activeDocId: string | null
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

  const handleDeleteClick = (docId: string) => {
    setPendingDeleteId(docId)
    setConfirmOpen(true)
  }

  const handleConfirmDelete = () => {
    if (pendingDeleteId) {
      onDelete(pendingDeleteId)
    }
    setConfirmOpen(false)
    setPendingDeleteId(null)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* API Key Section - Fixed at top */}
      <div className="flex-shrink-0 p-2 border-b">
        <APIKeyManager apiBase={apiBase} />
      </div>

      {/* Documents Header - Fixed */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b bg-background">
        <History className="w-4 h-4 text-muted-foreground" />
        <h2 className="font-medium text-sm">Recent Documents</h2>
        {documents.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            {documents.length}
          </span>
        )}
      </div>

      {/* Documents List - Scrollable */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-2">
            {documents.length === 0 ? (
              <div className="space-y-2 p-2">
                <div className="text-center py-8">
                  <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No documents yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Upload your first document to get started</p>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {documents.map((doc) => (
                  <div
                    key={doc.doc_id}
                    className={cn(
                      "group flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer border",
                      activeDocId === doc.doc_id && "bg-accent border-primary/20 shadow-sm",
                    )}
                    onClick={() => onSelect(doc.doc_id)}
                  >
                    {/* Status Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {doc.status === "done" ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
                      )}
                    </div>

                    {/* Document Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate mb-1" title={doc.filename}>
                        {doc.filename.length > 20 ? `${doc.filename.slice(0, 25)}...` : doc.filename}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="capitalize">{doc.status}</span>
                        <span>{new Date(doc.upload_time).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Delete Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteClick(doc.doc_id)
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Document"
        description="Are you sure you want to delete this document? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setConfirmOpen(false)
          setPendingDeleteId(null)
        }}
      />
    </div>
  )
}
