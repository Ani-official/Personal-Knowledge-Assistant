"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Key, ExternalLink, Eye, EyeOff, Check, AlertCircle } from "lucide-react"

export function APIKeyManager({ apiBase }: { apiBase: string }) {
  const [apiKey, setApiKey] = useState("")
  const [linked, setLinked] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [keyStatus, setKeyStatus] = useState<"none" | "local" | "linked">("none")

  useEffect(() => {
    checkKeyStatus()
  }, [])

  const checkKeyStatus = async () => {
    // Check if key is linked to account
    const authType = localStorage.getItem("auth_type")
    const token = localStorage.getItem("token")
    if (token) {
      try {
        const res = await fetch(`${apiBase}/api-key/status`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        })
        if (res.ok) {
          const data = await res.json()
          if (data.has_key) {
            setKeyStatus("linked")
            setLinked(true)
            return
          }
        }
      } catch (err) {
        console.error("Failed to check key status:", err)
      }
    }

    // Check local storage
    const localKey = localStorage.getItem("user-api-key")
    if (localKey) {
      setApiKey(localKey)
      setKeyStatus("local")
    }
  }

  const handleLocalSave = () => {
    if (!apiKey.trim()) {
      toast.error("API key is required")
      return
    }

    if (!apiKey.startsWith("sk-")) {
      toast.error("Invalid API key format. Should start with 'sk-'")
      return
    }

    localStorage.setItem("user-api-key", apiKey)
    setKeyStatus("local")
    toast.success("API key saved to browser storage")
  }

  const handleLinkToAccount = async () => {
    if (!apiKey.trim()) {
      toast.error("API key is required")
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem("token") || ""
      const authType = localStorage.getItem("auth_type")

      const res = await fetch(`${apiBase}/api-key/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authType === "email" && token
            ? { Authorization: `Bearer ${token}` }
            : {}),
        },
        body: JSON.stringify({ api_key: apiKey }),
        credentials: "include",
      })

      if (res.ok) {
        toast.success("API key linked successfully")
        setKeyStatus("linked")
        setLinked(true)
      } else {
        const data = await res.json()
        const message = Array.isArray(data.detail)
          ? data.detail.map((e: any) => e.msg).join(", ")
          : data.detail || "Failed to link API key"

        toast.error(message)

      }
    } catch (err) {
      console.error("API link error:", err)
      toast.error("An error occurred while linking the API key")
    } finally {
      setLoading(false)
    }
  }


  const handleRemoveKey = () => {
    localStorage.removeItem("user-api-key")
    setApiKey("")
    setKeyStatus("none")
    setLinked(false)
    toast.success("API key removed")
  }

  const getStatusBadge = () => {
    switch (keyStatus) {
      case "linked":
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-xs">
            <Check className="w-3 h-3 mr-1" />
            Linked
          </Badge>
        )
      case "local":
        return (
          <Badge variant="secondary" className="text-xs">
            <AlertCircle className="w-3 h-3 mr-1" />
            Local
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-xs">
            Not Set
          </Badge>
        )
    }
  }

  return (
    <div className="border rounded-lg p-3 bg-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">API Key</span>
        </div>
        {getStatusBadge()}
      </div>

      {keyStatus === "linked" ? (
        /* Linked State - Compact */
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/20 rounded text-xs border border-green-200 dark:border-green-800">
            <Check className="w-3 h-3 text-green-600 flex-shrink-0" />
            <span className="text-green-800 dark:text-green-200 font-medium">Securely linked to account</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleRemoveKey} className="w-full h-7 text-xs bg-transparent">
            Remove Key
          </Button>
        </div>
      ) : (
        /* Setup State - Compact */
        <div className="space-y-2">
          {/* API Key Input */}
          <div className="relative">
            <Input
              type={showKey ? "text" : "password"}
              placeholder="sk-or-v1-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="pr-8 h-8 text-xs"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-8 w-8 hover:bg-transparent"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </Button>
          </div>

          {/* Help text - Compact */}
          <div className="text-xs text-muted-foreground">
            <span>Need a key? </span>
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Get free credits <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLocalSave}
              disabled={!apiKey.trim()}
              className="flex-1 h-7 text-xs bg-transparent"
            >
              Save Local
            </Button>
            <Button
              size="sm"
              onClick={handleLinkToAccount}
              disabled={!apiKey.trim() || loading}
              className="flex-1 h-7 text-xs"
            >
              {loading ? "Linking..." : "Link Account"}
            </Button>
          </div>
          <div className="p-3 text-xs text-blue-800 bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:text-blue-200 rounded-md shadow-sm space-y-1">
            <p>
              <strong>Save Locally:</strong> Stored in your browser only
            </p>
            <p>
              <strong>Link to Account:</strong> Encrypted and stored securely on our servers
            </p>
          </div>

        </div>
      )}
    </div>
  )
}
