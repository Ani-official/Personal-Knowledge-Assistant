"use client"

import { useState, useRef, useEffect } from "react"
import { UploadCloud, Loader2, X, CheckCircle2, FileText } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function UploadFAB({
  onUpload,
  trigger,
}: {
  onUpload: (docId: string) => void
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [isDone, setIsDone] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const isClearedRef = useRef(false)
  const hasToasted = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const apiBase = process.env.NEXT_PUBLIC_API_URL

  // Cancel any in-flight poll when the component unmounts
  useEffect(() => () => { if (pollingRef.current) clearTimeout(pollingRef.current) }, [])

  const clear = () => {
    setFile(null)
    setUploading(false)
    setProgress(0)
    setStatusMsg(null)
    setIsDone(false)
    isClearedRef.current = true
    hasToasted.current = false
    if (pollingRef.current) clearTimeout(pollingRef.current)
  }

  const handleClose = (v: boolean) => {
    if (!v) clear()
    setOpen(v)
  }

  const pollStatus = (docId: string) => {
    const token = localStorage.getItem("token")
    setStatusMsg("Processing embeddings…")

    const tick = async () => {
      if (isClearedRef.current) return

      try {
        const res = await fetch(`${apiBase}/status/${docId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          credentials: token ? "omit" : "include",
        })
        const data = await res.json()

        if (data.status === "done") {
          if (hasToasted.current) return
          hasToasted.current = true
          setProgress(100)
          setIsDone(true)
          setStatusMsg("Ready!")
          toast.success("Document is ready to chat!")
          onUpload(docId)
          setTimeout(() => {
            setOpen(false)
            clear()
          }, 1200)
        } else if (data.status === "failed") {
          setStatusMsg("Processing failed.")
          const detail: string = data.error_detail ?? ""
          if (detail.toLowerCase().includes("no extractable text")) {
            toast.error("Could not extract text. The file may be a scanned or image-only PDF.")
          } else if (detail.includes("429") || detail.toLowerCase().includes("rate limit") || detail.toLowerCase().includes("quota")) {
            toast.error("Embedding quota exceeded. Check your Jina AI API key or plan limits.")
          } else if (detail.toLowerCase().includes("unauthorized") || detail.includes("401")) {
            toast.error("Invalid embedding API key. Check your EMBEDDING_API_KEY setting.")
          } else {
            toast.error("Document processing failed. Try uploading again.")
          }
        } else {
          // Still processing — schedule next poll only after this one finishes
          pollingRef.current = setTimeout(tick, 2000)
        }
      } catch {
        toast.error("Failed to check document status.")
        setStatusMsg("Status check failed.")
      }
    }

    pollingRef.current = setTimeout(tick, 2000)
  }

  const handleUpload = async (selectedFile: File) => {
    isClearedRef.current = false
    setUploading(true)
    setProgress(20)
    setStatusMsg("Uploading…")

    const formData = new FormData()
    formData.append("file", selectedFile)
    const token = localStorage.getItem("token")

    try {
      const res = await fetch(`${apiBase}/upload/`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
        credentials: token ? "omit" : "include",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || "Upload failed")
      }

      const result = await res.json()
      if (result.doc_id) {
        setProgress(55)
        localStorage.setItem("activeDocId", result.doc_id)
        pollStatus(result.doc_id)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed. Please try again."
      toast.error(msg)
      setUploading(false)
      setStatusMsg(null)
    }
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <UploadCloud className="w-4 h-4 mr-2" />
            Upload
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
          <DialogTitle className="flex items-center gap-2 text-base">
            <UploadCloud className="w-4 h-4 text-primary" />
            Upload a document
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            onClick={() => !file && fileInputRef.current?.click()}
            className={cn(
              "relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200",
              isDragging
                ? "border-primary bg-primary/5 scale-[1.01]"
                : file
                ? "border-primary/40 bg-primary/5 cursor-default"
                : "border-border hover:border-primary/40 hover:bg-muted/50"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,.html"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />

            {file ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                </div>
                {!uploading && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); setFile(null) }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ) : (
              <div>
                <UploadCloud className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm font-medium mb-1">Drop a file or click to browse</p>
                <p className="text-xs text-muted-foreground">PDF, TXT, MD, HTML up to 10MB</p>
              </div>
            )}
          </div>

          {/* Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  {statusMsg}
                </span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}

          {/* Submit button */}
          <Button
            onClick={() => file && handleUpload(file)}
            disabled={!file || uploading}
            className="w-full h-10"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {isDone ? "Done!" : "Processing…"}
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4 mr-2" />
                Upload document
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
