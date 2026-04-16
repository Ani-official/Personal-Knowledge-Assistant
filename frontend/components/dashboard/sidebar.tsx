"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Trash2,
  CheckCircle2,
  Loader2,
  XCircle,
  FileText,
  Plus,
  Key,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { APIKeyManager } from "./api-key-manager";
import UploadFAB from "@/components/ui/upload-fab";
import { Skeleton } from "@/components/ui/skeleton";

export type DocumentItem = {
  doc_id: string;
  filename: string;
  status: string;
  upload_time: string;
};

export default function DashboardSidebar({
  documents,
  loading = false,
  onSelect,
  onUpload,
  onDelete,
  activeDocId,
}: {
  documents: DocumentItem[];
  loading?: boolean;
  onSelect: (docId: string | null) => void;
  onUpload: (docId: string) => void;
  onDelete: (docId: string) => void;
  activeDocId: string | null;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const handleDeleteClick = (docId: string) => {
    setPendingDeleteId(docId);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (pendingDeleteId) onDelete(pendingDeleteId);
    setConfirmOpen(false);
    setPendingDeleteId(null);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* ── Top: Upload button ─────────────────────── */}
      <div className="flex-shrink-0 px-3 pt-3 pb-2">
        <UploadFAB
          onUpload={onUpload}
          trigger={
            <Button
              className="w-full h-10 gap-2 font-medium shadow-sm shadow-primary/20"
              variant="default"
            >
              <Plus className="w-4 h-4" />
              New Document
            </Button>
          }
        />
      </div>

      {/* ── Documents section header ─────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          Documents
        </span>
        {!loading && documents.length > 0 && (
          <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
            {documents.length}
          </span>
        )}
      </div>

      {/* ── Document list ────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
       <ScrollArea className="h-full w-full [&_[data-slot=scroll-area-viewport]]:overflow-x-hidden">
          <div className="mr-[-4px] flex min-w-0 flex-col items-stretch gap-0.5 pl-3 pr-0 pb-2">
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
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mb-3">
                  <FileText className="w-5 h-5 text-muted-foreground/60" />
                </div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  No documents yet
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Upload your first document above to get started
                </p>
              </div>
            ) : (
              documents.map((doc) => {
                const isActive = activeDocId === doc.doc_id;
                return (
                  <div
                    key={doc.doc_id}
                    onClick={() =>
                      doc.status === "done" && onSelect(doc.doc_id)
                    }
                    className={cn(
                      "group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2 rounded-xl pl-2.5 pr-0.5 py-2.5 transition-all duration-150",
                      doc.status === "done"
                        ? "cursor-pointer"
                        : "cursor-default",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "hover:bg-sidebar-accent/50"
                    )}
                  >
                    {/* Status indicator */}
                    <div className="mt-0.5">
                      {doc.status === "done" ? (
                        <CheckCircle2
                          className={cn(
                            "w-3.5 h-3.5",
                            isActive ? "text-primary" : "text-green-500"
                          )}
                        />
                      ) : doc.status === "failed" ? (
                        <XCircle className="w-3.5 h-3.5 text-destructive" />
                      ) : (
                        <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                      )}
                    </div>

                    {/* Name + meta */}
                    <div className="min-w-0 overflow-hidden">
                      <p
                        className="text-sm font-medium truncate leading-snug"
                        title={doc.filename}
                      >
                        {doc.filename}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        {doc.status === "processing"
                          ? "Processing…"
                          : doc.status === "failed"
                          ? "Failed"
                          : formatDate(doc.upload_time)}
                      </p>
                    </div>

                    {/* Delete button */}
                    <div className="flex w-5 self-center items-center justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(doc.doc_id);
                        }}
                        className={cn(
                          "h-7 w-7 rounded-lg text-muted-foreground/70 transition-all hover:text-destructive hover:bg-destructive/8",
                          "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100",
                          isActive && "md:opacity-100"
                        )}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ── Bottom: API Key settings ─────────────────── */}
      <div className="flex-shrink-0 border-t border-sidebar-border">
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 hover:text-muted-foreground transition-colors"
        >
          <span className="flex items-center gap-2">
            <Key className="w-3.5 h-3.5" />
            API Key
          </span>
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 transition-transform",
              settingsOpen && "rotate-180"
            )}
          />
        </button>
        {settingsOpen && (
          <div className="px-3 pb-3">
            <APIKeyManager apiBase={apiBase} />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete document"
        description="This will permanently delete the document and all its data. This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingDeleteId(null);
        }}
      />
    </div>
  );
}
