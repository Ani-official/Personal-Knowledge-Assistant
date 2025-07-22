"use client"

import { useState, useRef } from "react"
import { Plus, UploadCloud, XCircle, Loader2, X } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"

export default function UploadFAB({ onUpload }: { onUpload: (docId: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<string | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const isClearedRef = useRef(false)
  const hasToasted = useRef(false)

  const apiBase = process.env.NEXT_PUBLIC_API_URL

  const clear = () => {
    setFile(null)
    setUploading(false)
    setProgress(0)
    setStatus(null)
    isClearedRef.current = true
    hasToasted.current = false
    if (pollingRef.current) clearInterval(pollingRef.current)
  }

  const pollStatus = async (docId: string) => {
    const authType = localStorage.getItem("auth_type")
    const token = localStorage.getItem("token")
    setStatus("Processing embeddings...")

    pollingRef.current = setInterval(async () => {
      if (isClearedRef.current) return clearInterval(pollingRef.current!)

      try {
        const res = await fetch(`${apiBase}/status/${docId}`, {
          headers: authType === "email"
            ? { Authorization: `Bearer ${token}` }
            : undefined,
          credentials: "include",
        })
        const data = await res.json()

        if (data.status === "done") {
          clearInterval(pollingRef.current!)
          setProgress(100)
          if (!hasToasted.current) {
            toast.success("✅ Document is ready!")
            hasToasted.current = true
          }
          setStatus("Done")
          onUpload(docId)
          setTimeout(() => {
            setExpanded(false)
            clear()
            hasToasted.current = false // Reset for future uploads
          }, 1500)
        }
      } catch (err) {
        console.error("Status polling failed:", err)
        clearInterval(pollingRef.current!)
        toast.error("Failed to check document status")
        setStatus("❌ Failed to check status")
      }
    }, 2000)
  }

  const handleUpload = async (file: File) => {
    setUploading(true)
    setProgress(20)
    const formData = new FormData()
    formData.append("file", file)

    const token = localStorage.getItem("token")
    const authType = localStorage.getItem("auth_type")

    try {
      const res = await fetch(`${apiBase}/upload/`, {
        method: "POST",
        headers:
          authType === "email"
            ? { Authorization: `Bearer ${token}` }
            : undefined,
        body: formData,
        credentials: "include",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || "Upload failed")
      }

      const result = await res.json()
      console.log("Upload successful:", result)

      if (result.doc_id) {
        setProgress(60)
        localStorage.setItem("activeDocId", result.doc_id)
        pollStatus(result.doc_id)
      }
    } catch (err) {
      console.error("Upload error:", err)
      const errorMsg = err instanceof Error ? err.message : "Upload failed. Please try again."
      toast.error(errorMsg || "Upload failed")
      setUploading(false)
      setStatus("❌ Upload failed")
    }
  }

  if (!expanded) {
    return (
      <div className="sticky top-4 z-30 mb-26 sm:mb-16">
        <Button
          variant="outline"
          onClick={() => setExpanded(true)}
          className="w-10 h-10 p-0 rounded-full"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>
    )
  }

  return (
    <Card className="w-full max-w-sm my-4 relative z-40">
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          clear()
          setExpanded(false)
        }}
        className="absolute top-2 left-2"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </Button>

      <CardHeader className="pl-12 pr-4">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <UploadCloud className="w-4 h-4" />
          Upload a Document
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <Input
          type="file"
          accept=".pdf,.txt,.md,.html"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        {file && (
          <div className="text-sm flex items-center justify-between">
            <span className="truncate max-w-[200px]">{file.name}</span>
            <Button variant="ghost" size="icon" onClick={clear}>
              <XCircle className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        )}

        {status && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">{status}</p>
            <Progress value={progress} />
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button
          onClick={() => file && handleUpload(file)}
          disabled={!file || uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="animate-spin w-4 h-4 mr-2" />
              Uploading...
            </>
          ) : (
            "Upload"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
