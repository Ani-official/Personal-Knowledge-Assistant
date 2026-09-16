"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Key, LogOut, Moon } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import ApiKeyDialog from "./api-key-dialog"

function initialsFrom(email: string | null) {
  if (!email) return "··"
  const [name] = email.split("@")
  const parts = name.split(/[._-]+/).filter(Boolean)
  const letters = parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2)
  return letters.toUpperCase()
}

function displayNameFrom(email: string | null) {
  if (!email) return "Your account"
  const [name] = email.split("@")
  return name
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export default function UserMenu({
  email,
  mounted,
}: {
  email: string | null
  mounted: boolean
}) {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [apiKeyOpen, setApiKeyOpen] = useState(false)

  const isDark = theme === "dark"

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
    localStorage.removeItem("activeConversationId")
    router.push("/")
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "flex size-8 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground",
            "outline-hidden transition-shadow hover:shadow-md hover:shadow-primary/25 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          )}
        >
          {initialsFrom(email)}
          <span className="sr-only">Open account menu</span>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-60">
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-medium">{displayNameFrom(email)}</p>
            <p className="truncate text-xs text-muted-foreground">{email ?? "Signed in"}</p>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={(event) => {
              // Keep the menu open so the switch reads as an inline toggle.
              event.preventDefault()
              setTheme(isDark ? "light" : "dark")
            }}
            className="justify-between"
          >
            <span className="flex items-center gap-2">
              <Moon />
              Dark mode
            </span>
            <Switch checked={mounted ? isDark : false} className="pointer-events-none" />
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={() => setApiKeyOpen(true)}>
            <Key />
            API key
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem variant="destructive" onSelect={() => void handleLogout()}>
            <LogOut />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ApiKeyDialog open={apiKeyOpen} onOpenChange={setApiKeyOpen} />
    </>
  )
}
