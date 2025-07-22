"use client"

import { Button } from "@/components/ui/button"
import { Moon, Sun, LogOut } from "lucide-react"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import MobileSidebarDrawer from "@/components/dashboard/mobile-sidebar-drawer"
import type { DocumentItem } from "./sidebar"

export function DashboardNavbar({
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
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  // Handle logout for both email/password and Google auth
  const handleLogout = async () => {
  const authType = localStorage.getItem("auth_type")

  if (authType === "google") {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
        method: "GET",
        credentials: "include",
      })
    } catch (err) {
      console.error("OAuth logout error:", err)
    }
  }

  // Clear client-side tokens for both types
  localStorage.removeItem("token")
  localStorage.removeItem("auth_type")
  router.push("/")
}


  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header className="flex items-center justify-between px-3 sm:px-4 lg:px-6 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Sidebar Toggle */}
        <div className="lg:hidden">
          <MobileSidebarDrawer
            documents={documents}
            onSelect={onSelect}
            onDelete={onDelete}
            activeDocId={activeDocId}
          />
        </div>

        <h1 className="text-lg sm:text-xl font-semibold truncate">KnowAI</h1>

        {/* Active document indicator on mobile */}
        {activeDocId && (
          <div className="hidden sm:flex items-center text-xs text-muted-foreground">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            Document active
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="h-8 w-8 sm:h-9 sm:w-9"
        >
          {mounted &&
            (theme === "dark" ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />)}
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Logout button */}
        <Button variant="outline" onClick={handleLogout} size="sm" className="h-8 sm:h-9 px-2 sm:px-3 bg-transparent">
          <LogOut className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  )
}
