"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"

import AuthDialog from "@/components/ui/auth-dialog"
import { BRAND_NAME, BrandMark, BrandWordmark } from "@/components/dashboard/brand-mark"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/useAuth"

export default function Navbar() {
  const { status } = useAuth()

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3 text-lg font-semibold" aria-label={BRAND_NAME}>
          <BrandMark className="size-10 drop-shadow-md" />
          <div>
            <BrandWordmark className="block leading-none" />
            <div className="mt-1 text-xs font-medium tracking-[0.2em] text-muted-foreground">GROUNDED Q&amp;A</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
          <Link href="#features" className="transition-colors hover:text-foreground">Features</Link>
          <Link href="#audience" className="transition-colors hover:text-foreground">Use cases</Link>
          <Link href="#faq" className="transition-colors hover:text-foreground">FAQ</Link>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {status === "authenticated" ? (
            <Link href="/dashboard">
              <Button size="sm" variant="default" className="h-10 gap-1.5 rounded-full px-4">
                Dashboard <ArrowRight className="size-3.5" />
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
