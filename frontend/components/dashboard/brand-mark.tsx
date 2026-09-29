import { useId } from "react"

import { cn } from "@/lib/utils"

export const BRAND_NAME = "EvidentiaAI"

/**
 * The logo mark: an E made of three lines of text, with the middle line
 * highlighted — the cited passage an answer is grounded in. Same artwork as
 * app/icon.svg (the favicon). Fixed brand colours, so it reads the same in
 * light and dark themes.
 */
export function BrandMark({ className }: { className?: string }) {
  const gradientId = useId()
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden
      className={cn("size-7 shrink-0 drop-shadow-sm", className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0E7FA3" />
          <stop offset="1" stopColor="#064A63" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${gradientId})`} />
      <rect x="14" y="15" width="9" height="34" rx="3" fill="#FFFFFF" />
      <rect x="14" y="15" width="29" height="9" rx="3" fill="#FFFFFF" />
      <rect x="14" y="40" width="29" height="9" rx="3" fill="#FFFFFF" />
      <path
        d="M22 28.4 L49.6 26.9 Q51.8 26.8 51.6 29 L51 35.1 Q50.8 37.1 48.7 37.2 L22 38 Z"
        fill="#FBBF24"
      />
    </svg>
  )
}

/** "Evidentia" in the text colour, "AI" in the brand colour. */
export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("truncate font-semibold tracking-tight", className)}>
      Evidentia<span className="text-primary">AI</span>
    </span>
  )
}

export function BrandLockup({ className }: { className?: string }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)} aria-label={BRAND_NAME}>
      <BrandMark />
      <BrandWordmark className="text-[15px]" />
    </span>
  )
}
