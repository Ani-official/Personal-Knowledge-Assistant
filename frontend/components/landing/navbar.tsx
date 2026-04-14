"use client"

import Link from "next/link"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import AuthDialog from "@/components/ui/auth-dialog"
import { useAuth } from "@/lib/useAuth"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export default function Navbar() {
  const { status } = useAuth()

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="text-primary">Know</span>
          <span>AI</span>
        </Link>

        {/* Nav links — hidden on small screens */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
          <Link href="#audience" className="hover:text-foreground transition-colors">Who it's for</Link>
          <Link href="#faq" className="hover:text-foreground transition-colors">FAQ</Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {status === "authenticated" ? (
            <Link href="/dashboard">
              <Button size="sm" variant="default" className="gap-1.5 h-9">
                Dashboard <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          ) : (
            <AuthDialog />
          )}
        </div>
      </div>
    </header>
  )
}
