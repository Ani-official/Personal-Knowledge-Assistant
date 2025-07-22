"use client"

import { useState, useRef } from "react"
import { UploadCloud, Loader2, XCircle } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

export default function UploadBox({ onUpload }: { onUpload: (docId: string) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<string | null>(null)

  const dropRef = useRef<HTMLLabelElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const isClearedRef = useRef(false)

  const apiBase = process.env.NEXT_PUBLIC_API_URL

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0]
      setFile(droppedFile)

      if (inputRef.current) {
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(droppedFile)
        inputRef.current.files = dataTransfer.files
      }

      e.dataTransfer.clearData()
    }
  }

  const clearFile = () => {
    isClearedRef.current = true
    setFile(null)
    setUploading(false)
    setProcessing(false)
    setProgress(0)
    setStatus(null)

    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }

    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  const pollStatus = async (docId: string) => {
  if (!docId || docId === "undefined") {
    alert("Invalid document ID received.")
    console.warn("Skipping pollStatus due to invalid docId:", docId)
    return
  }

  setProcessing(true)
  setStatus("Processing Embeddings")

  const token = localStorage.getItem("token")

  if (!token) {
    console.warn("No auth token found for polling")
    return
  }

    pollingRef.current = setInterval(async () => {
      if (isClearedRef.current) {
        clearInterval(pollingRef.current!)
        return
      }

      try {
        const res = await fetch(`${apiBase}/status/${docId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        const data = await res.json()

        if (data.status === "done") {
          clearInterval(pollingRef.current!)
          if (isClearedRef.current) return

          setProgress(100)
          setProcessing(false)
          setStatus("Done")
          onUpload(docId)

          setTimeout(() => {
            if (!isClearedRef.current) {
              setProgress(0)
              setStatus(null)
            }
          }, 1500)
        }
      } catch (err) {
        console.error("Polling error:", err)
      }
    }, 2000)
  }

  const uploadFile = async () => {
  if (!file) return
  isClearedRef.current = false
  setUploading(true)
  setProgress(10)
  setStatus("Uploading")

  const formData = new FormData()
  formData.append("file", file)

  const token = localStorage.getItem("token")

  if (!token) {
    alert("You must be logged in to upload.")
    setUploading(false)
    return
  }

  try {
    const res = await fetch(`${apiBase}/upload/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    })

    if (!res.ok) {
      const error = await res.json()
      console.error("Upload error:", error)
      alert(error.detail || "Upload failed.")
      setStatus("Failed")
      return
    }

    setProgress(70)
    setStatus("Parsing")

    const data = await res.json()

    if (!data.doc_id) {
      alert("❌ Upload succeeded, but document ID was not returned.")
      console.error("Missing doc_id in upload response:", data)
      setStatus("Failed")
      return
    }

    pollStatus(data.doc_id)
  } catch (err) {
    alert("❌ Upload failed. Please try again.")
    console.error("Upload error:", err)
    setStatus("Failed")
  } finally {
    setUploading(false)
  }
}


  const disableButton = !file || uploading || processing

  return (
    <Card className="w-full max-w-3xl mx-auto mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UploadCloud className="w-5 h-5" /> Upload a Document
        </CardTitle>
      </CardHeader>

      <CardContent>
        <label
          ref={dropRef}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="flex flex-col items-center justify-center w-full border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center cursor-pointer hover:border-primary"
        >
          <UploadCloud className="w-10 h-10 mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-2">
            Drag & drop your file here or use the file selector below
          </p>

          <div className="w-full flex items-center justify-between gap-4 mt-2">
            <Input
              ref={inputRef}
              type="file"
              accept=".pdf,.txt,.md,.html"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full"
            />
            {file && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground truncate max-w-[150px]">
                  {file.name}
                </span>
                <Button variant="ghost" size="icon" onClick={clearFile}>
                  <XCircle className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            )}
          </div>
        </label>

        {status && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-1">{status}</p>
            <Progress value={progress} className="[&>div]:transition-all [&>div]:duration-800 [&>div]:ease-in-out" />
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button onClick={uploadFile} disabled={disableButton} className="w-full">
          {(uploading || processing) ? (
            <><Loader2 className="animate-spin w-4 h-4 mr-2" /> Uploading...</>
          ) : (
            "Upload"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
