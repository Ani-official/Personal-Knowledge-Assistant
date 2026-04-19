import Link from "next/link"
import {
  ArrowRight,
  FileText,
  Lock,
  MessageSquareQuote,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react"

import { Button } from "@/components/ui/button"

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pb-24 pt-18 sm:px-6 sm:pt-24">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-primary/12 blur-3xl" />
        <div className="absolute right-[8%] top-28 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
        <div className="noise-grid absolute inset-x-0 top-12 h-[36rem] opacity-50 [mask-image:linear-gradient(to_bottom,white,transparent)]" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="max-w-3xl">
          <div className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-4 py-1.5 text-sm font-semibold text-primary">
            <Sparkles className="size-3.5" />
            Premium retrieval, grounded in your files
          </div>

          <h1 className="animate-fade-in-up stagger-1 mt-8 text-balance font-display text-5xl leading-tight font-semibold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Answers that stay faithful to
            <span className="block bg-gradient-to-r from-primary via-primary/85 to-accent-foreground bg-clip-text text-transparent pb-2">
              the files you upload.
            </span>
          </h1>

          <p className="animate-fade-in-up stagger-2 mt-6 max-w-2xl text-balance text-lg leading-8 text-muted-foreground sm:text-xl">
            EvidentiaAI turns PDFs, notes, research, and internal docs into a calm, premium workspace for grounded Q&amp;A. Upload once, ask naturally, and get responses shaped by your source material instead of generic AI guesses.
          </p>

          <div className="animate-fade-in-up stagger-3 mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/dashboard">
              <Button size="lg" className="hero-sheen h-12 rounded-full px-7 text-base font-semibold shadow-lg shadow-primary/20">
                Open workspace
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="h-12 rounded-full border-border/70 bg-background/70 px-7 text-base">
                Explore the experience
              </Button>
            </Link>
          </div>

          <div className="animate-fade-in-up stagger-4 mt-12 grid gap-3 sm:grid-cols-3">
            {[
              { icon: FileText, label: "PDF, TXT, MD, HTML" },
              { icon: ScanSearch, label: "Grounded retrieval" },
              { icon: Lock, label: "Private by design" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="premium-panel hover-lift flex items-center gap-3 rounded-2xl px-4 py-4 text-sm font-medium text-muted-foreground">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </div>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-6 top-10 hidden h-24 w-24 rounded-full bg-accent/20 blur-2xl sm:block" />
          <div className="premium-panel relative rounded-[2rem] p-4 shadow-2xl shadow-primary/10 sm:p-6">
            <div className="noise-grid absolute inset-0 rounded-[2rem] opacity-40" />

            <div className="relative grid gap-4">
              <div className="float-slow premium-panel rounded-[1.5rem] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Board memo.pdf</p>
                    <p className="text-xs text-muted-foreground">247 sections indexed • 2 min ago</p>
                  </div>
                  <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                    Ready
                  </div>
                </div>
                <div className="grid gap-3 text-sm text-muted-foreground">
                  <div className="rounded-2xl bg-muted/70 p-4">
                    Summarize the budget risk in Q4 and cite the section that supports it.
                  </div>
                  <div className="rounded-2xl border border-primary/20 bg-primary/8 p-4 text-foreground">
                    Q4 risk is concentrated in vendor migration costs and delayed renewals. The supporting context appears in the section titled <span className="font-semibold">“Operational Outlook, page 18”</span>, where cost overruns and deferred revenue are both called out.
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[0.9fr_1.1fr]">
                <div className="premium-panel float-delay rounded-[1.5rem] p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-accent/35 text-accent-foreground">
                      <Workflow className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Retrieval pipeline</p>
                      <p className="text-xs text-muted-foreground">Built to stay inside context</p>
                    </div>
                  </div>
                  <div className="space-y-3 text-sm">
                    {["Upload & parse", "Chunk & index", "Retrieve evidence", "Compose answer"].map((step, index) => (
                      <div key={step} className="flex items-center gap-3 rounded-2xl bg-muted/60 px-3 py-2.5">
                        <span className="flex size-7 items-center justify-center rounded-full bg-background text-xs font-semibold text-foreground">{index + 1}</span>
                        <span className="text-muted-foreground">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="premium-panel rounded-[1.5rem] p-5">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Why teams choose it</p>
                      <p className="text-xs text-muted-foreground">Measured for clarity, speed, and trust</p>
                    </div>
                    <ShieldCheck className="size-4 text-primary" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { value: "Grounded", label: "Answers constrained to source content" },
                      { value: "< 60s", label: "From file upload to first response" },
                      { value: "Clean", label: "Low-noise interface for sustained work" },
                      { value: "Flexible", label: "Bring your own key when needed" },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl bg-muted/60 p-4">
                        <p className="text-lg font-semibold text-foreground">{item.value}</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="premium-panel absolute -bottom-6 left-6 hidden max-w-56 rounded-2xl px-4 py-3 lg:block">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MessageSquareQuote className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Sharper answers</p>
                <p className="text-xs text-muted-foreground">Less hallucination, more source fidelity</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
