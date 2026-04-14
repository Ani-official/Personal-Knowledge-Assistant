import { ArrowRight, Sparkles, FileText, MessageSquare, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function HeroSection() {
  return (
    <section className="relative pt-24 pb-28 px-4 overflow-hidden">
      {/* Subtle gradient orb background */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-violet-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto text-center">
        {/* Badge */}
        <div className="animate-fade-in-up inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 rounded-full px-4 py-1.5 text-sm font-medium mb-8">
          <Sparkles className="w-3.5 h-3.5" />
          AI-powered document understanding
        </div>

        {/* Headline */}
        <h1 className="animate-fade-in-up stagger-1 text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.08] mb-6">
          Chat with your{" "}
          <span className="bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
            documents
          </span>
        </h1>

        {/* Subheading */}
        <p className="animate-fade-in-up stagger-2 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          Upload a PDF, text file, or markdown document. Ask questions in plain English.
          Get precise, cited answers — instantly.
        </p>

        {/* CTA */}
        <div className="animate-fade-in-up stagger-3 flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
          <Link href="/dashboard">
            <Button size="lg" className="h-12 px-8 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow">
              Get started free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        {/* Social proof strip */}
        <p className="text-sm text-muted-foreground/70">
          No credit card required &nbsp;·&nbsp; Free to use &nbsp;·&nbsp; PDF, TXT, MD, HTML
        </p>

        {/* Feature highlights */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
          {[
            { icon: FileText, label: "Upload any document" },
            { icon: MessageSquare, label: "Ask in plain English" },
            { icon: Zap, label: "Instant AI answers" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center justify-center gap-2.5 bg-muted/50 border border-border/60 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground">
              <Icon className="w-4 h-4 text-primary/70" />
              {label}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
