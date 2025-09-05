"use client"

import Link from "next/link"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import AuthDialog from "@/components/ui/auth-dialog"
import { useAuth } from "@/lib/useAuth"


export default function Navbar() {

  const { status } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">KnowAI</Link>
        <div className="flex gap-5 items-center">
          <Link href="#features" className="text-sm font-medium">Features</Link>
          <Link href="#faq" className="text-sm font-medium">FAQ</Link>
          <Link href="/dashboard" className="text-sm font-medium">Dashboard</Link>
          <div className="flex gap-4">
            {/* ✅ Hide login button if already authenticated */}
            {status !== "authenticated" && <AuthDialog />}
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
