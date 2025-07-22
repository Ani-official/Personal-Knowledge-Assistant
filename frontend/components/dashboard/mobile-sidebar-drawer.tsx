"use client"

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { DialogTitle } from "@/components/ui/dialog"
import { Menu, X } from "lucide-react"
import DashboardSidebar, { type DocumentItem } from "@/components/dashboard/sidebar"
import { useState } from "react"

export default function MobileSidebarDrawer({
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
  const [open, setOpen] = useState(false)

  const handleSelect = (docId: string | null) => {
    onSelect(docId)
    setOpen(false) // Close drawer after selection
  }

  const handleDelete = (docId: string) => {
    onDelete(docId)
    // Don't close drawer on delete, user might want to select another doc
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Menu className="w-5 h-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-80 sm:w-96">
        <div className="flex items-center justify-between p-4 border-b">
          <DialogTitle className="font-semibold">Documents</DialogTitle>
        </div>
        <DashboardSidebar
          documents={documents}
          onSelect={handleSelect}
          onDelete={handleDelete}
          activeDocId={activeDocId}
        />
      </SheetContent>
    </Sheet>
  )
}
