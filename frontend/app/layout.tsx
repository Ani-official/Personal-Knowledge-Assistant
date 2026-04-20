import "@/app/globals.css"
import { Fraunces, Manrope } from "next/font/google"
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.variable} ${fraunces.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
