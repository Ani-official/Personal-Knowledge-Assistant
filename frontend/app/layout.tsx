import "@/app/globals.css"
import { Fraunces, Manrope } from "next/font/google"
import type { Metadata } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "sonner"

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://evidentiaai.vercel.app"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "EvidentiaAI",
    template: "%s | EvidentiaAI",
  },
  description:
    "EvidentiaAI helps you upload documents, search them, and chat with grounded AI answers from your own knowledge base.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "EvidentiaAI",
    description:
      "Upload documents, search them, and chat with AI answers grounded in your own files.",
    url: siteUrl,
    siteName: "EvidentiaAI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EvidentiaAI",
    description:
      "Upload documents, search them, and chat with AI answers grounded in your own files.",
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.variable} ${fraunces.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster richColors position="top-right" />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
