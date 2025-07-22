"use client"

import type React from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
// import { Separator } from "@/components/ui/separator"
import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { Eye, EyeOff, Mail, Lock, User, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/useAuth"

// Google Logo Component
const GoogleLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
)

export default function AuthDialog({
  mode = "signin",
  openByDefault = false,
}: {
  mode?: "signin" | "signup"
  openByDefault?: boolean
}) {
  const [isSignup, setIsSignup] = useState(mode === "signup")
  const [open, setOpen] = useState(openByDefault)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const { theme } = useTheme()

  const { status } = useAuth()

  // Auto-close dialog if authenticated
  useEffect(() => {
    if (status === "authenticated") {
      setOpen(false)
    }
  }, [status])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isSignup && password !== confirmPassword) {
      alert("Passwords don't match")
      return
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters")
      return
    }

    setLoading(true)
    const url = isSignup ? "/auth/signup" : "/auth/login"

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (res.ok) {
        localStorage.setItem("token", data.access_token)
        localStorage.setItem("auth_type", "email")
        window.location.href = "/dashboard"
      } else {
        alert(data.detail || "Something went wrong")
      }
    } catch (error) {
      alert("❌ Network error. Try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/login/google`
    localStorage.setItem("auth_type", "google")
  }

  const toggleMode = () => {
    setIsSignup(!isSignup)
    setPassword("")
    setConfirmPassword("")
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" onClick={() => setOpen(true)} className="bg-background hover:bg-accent border-border">
          {isSignup ? "Sign Up" : "Log In"}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[420px] p-0">
        <div className="p-6">
          <DialogHeader className="text-center space-y-2">
            <DialogTitle className="text-2xl font-bold">
              {isSignup ? "Create your account" : "Welcome back"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {isSignup ? "Sign up to start chatting with your documents" : "Sign in to continue to your dashboard"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-6">
            {/* Google Sign In Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 bg-background hover:bg-accent border-border"
              onClick={handleGoogleAuth}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <GoogleLogo className="w-5 h-5 mr-2" />
              )}
              Continue with Google
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <hr className="w-full border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
              </div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input */}
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11"
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-11 w-11 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Confirm Password (Sign Up Only) */}
              {isSignup && (
                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10 h-11"
                      required
                      minLength={6}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-11 w-11 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {isSignup ? "Creating account..." : "Signing in..."}
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4 mr-2" />
                    {isSignup ? "Create Account" : "Sign In"}
                  </>
                )}
              </Button>
            </form>

            {/* Toggle Mode */}
            <div className="text-center text-sm">
              <span className="text-muted-foreground">
                {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
              </span>
              <button type="button" className="text-primary hover:underline font-medium" onClick={toggleMode}>
                {isSignup ? "Sign in" : "Sign up"}
              </button>
            </div>

            {/* Terms and Privacy (Sign Up Only) */}
            {isSignup && (
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                By creating an account, you agree to our{" "}
                <a href="/terms" className="text-primary hover:underline">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </a>
                .
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
