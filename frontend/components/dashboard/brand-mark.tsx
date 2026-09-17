import { cn } from "@/lib/utils"

export const BRAND_NAME = "EvidentiaAI"

/**
 * The square logo tile. Used on its own in the collapsed rail and paired with
 * the wordmark in the sidebar header.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-[13px] font-bold leading-none text-primary-foreground shadow-sm shadow-primary/25",
        className
      )}
    >
      E
    </span>
  )
}

export function BrandLockup({ className }: { className?: string }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <BrandMark />
      <span className="truncate text-[15px] font-semibold tracking-tight">{BRAND_NAME}</span>
    </span>
  )
}
