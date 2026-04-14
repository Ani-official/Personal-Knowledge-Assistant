"use client"

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { DialogTitle } from "@/components/ui/dialog"
import { Menu } from "lucide-react"
import DashboardSidebar, { type DocumentItem } from "@/components/dashboard/sidebar"
import { useState } from "react"

export default function MobileSidebarDrawer({
  documents,
  onSelect,
  onUpload,
  onDelete,
  activeDocId,
}: {
  documents: DocumentItem[]
  onSelect: (docId: string | null) => void
  onUpload: (docId: string) => void
  onDelete: (docId: string) => void
  activeDocId: string | null
}) {
  const [open, setOpen] = useState(false)

  const handleSelect = (docId: string | null) => {
    onSelect(docId)
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Menu className="w-5 h-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-72 sm:w-80">
        <div className="flex items-center px-4 h-14 border-b border-border/60">
          <DialogTitle className="font-bold text-base">
            EvidentiaAI
          </DialogTitle>
        </div>
        <div className="h-[calc(100%-3.5rem)]">
          <DashboardSidebar
            documents={documents}
            onSelect={handleSelect}
            onUpload={onUpload}
            onDelete={onDelete}
            activeDocId={activeDocId}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
