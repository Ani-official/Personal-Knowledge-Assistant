"use client"

import { Button } from "@/components/ui/button"
import { Moon, Sun, LogOut, FileText } from "lucide-react"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import MobileSidebarDrawer from "@/components/dashboard/mobile-sidebar-drawer"
import type { DocumentItem } from "./sidebar"

export function DashboardNavbar({
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
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => { setMounted(true) }, [])

  const activeDoc = documents.find((d) => d.doc_id === activeDocId)

  const handleLogout = async () => {
    const authType = localStorage.getItem("auth_type")
    if (authType === "google") {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
          method: "GET",
          credentials: "include",
        })
      } catch {}
    }
    localStorage.removeItem("token")
    localStorage.removeItem("auth_type")
    localStorage.removeItem("activeDocId")
    router.push("/")
  }

  return (
    <header className="flex items-center justify-between px-3 sm:px-4 h-14 border-b border-border/60 bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40">
      {/* Left: mobile menu + brand */}
      <div className="flex items-center gap-2">
        <div className="lg:hidden">
          <MobileSidebarDrawer
            documents={documents}
            onSelect={onSelect}
            onUpload={onUpload}
            onDelete={onDelete}
            activeDocId={activeDocId}
          />
        </div>
        <span className="font-bold text-lg hidden sm:block">
          EvidentiaAI
        </span>
      </div>

      {/* Center: active document name */}
      {activeDoc && (
        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground max-w-xs truncate">
          <FileText className="w-3.5 h-3.5 flex-shrink-0 text-primary/70" />
          <span className="truncate">{activeDoc.filename}</span>
        </div>
      )}

      {/* Right: actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="h-8 w-8 text-muted-foreground"
        >
          {mounted && (
            theme === "dark"
              ? <Sun className="w-4 h-4" />
              : <Moon className="w-4 h-4" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="h-8 gap-1.5 text-muted-foreground hover:text-foreground px-2 sm:px-3"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline text-sm">Logout</span>
        </Button>
      </div>
    </header>
  )
}
