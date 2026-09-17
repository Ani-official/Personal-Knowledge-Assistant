"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { APIKeyManager } from "./api-key-manager"

/**
 * The API key panel lives in the sidebar, but the sidebar can be collapsed or
 * hidden on mobile — so the profile menu opens the same manager in a dialog.
 */
export default function ApiKeyDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>API key</DialogTitle>
          <DialogDescription>
            Add your OpenRouter key to unlock every model. Free models work without one.
          </DialogDescription>
        </DialogHeader>
        <APIKeyManager apiBase={apiBase} />
      </DialogContent>
    </Dialog>
  )
}
