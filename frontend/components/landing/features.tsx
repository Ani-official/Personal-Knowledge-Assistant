import {
  ArrowUpRight,
  Bot,
  FileSearch,
  Globe,
  Lock,
  Quote,
  Sparkles,
  UploadCloud,
} from "lucide-react"

const features = [
  {
    icon: UploadCloud,
    title: "Effortless ingestion",
    description:
      "Drop in PDFs, markdown, or working notes and turn them into a searchable, answerable knowledge layer in minutes.",
    eyebrow: "Ingest",
    className: "sm:col-span-2 lg:col-span-1",
  },
  {
    icon: FileSearch,
    title: "Retrieval before generation",
    description:
      "The system searches your indexed context first, then writes the response around the most relevant evidence it can find.",
    eyebrow: "Grounded",
    className: "sm:col-span-2 lg:col-span-2",
  },
  {
    icon: Bot,
    title: "Natural follow-up questions",
    description:
      "Keep drilling into a document without restating everything. The conversation stays anchored to the uploaded source.",
    eyebrow: "Conversational",
    className: "sm:col-span-1 lg:col-span-1",
  },
  {
    icon: Lock,
    title: "Private by default",
    description:
      "Sensitive files stay in a controlled workspace designed for internal notes, strategy decks, contracts, and research.",
    eyebrow: "Trust",
    className: "sm:col-span-1 lg:col-span-1",
  },
  {
    icon: Quote,
    title: "Source-backed responses",
    description:
      "Answers are written from the material you provided, making it easier to verify what the assistant is actually relying on.",
    eyebrow: "Evidence",
    className: "sm:col-span-1 lg:col-span-1",
  },
  {
    icon: Globe,
    title: "Bring your own model access",
    description:
      "Use the built-in flow or connect your own API key when you want broader model choice and production control.",
    eyebrow: "Flexible",
    className: "sm:col-span-2 lg:col-span-1",
  },
]

export default function FeaturesSection() {
  return (
    <section id="features" className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-4 py-1.5 text-sm font-semibold text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />
              Built for premium document Q&amp;A
            </div>
            <h2 className="mt-6 text-balance font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              A modern retrieval experience, arranged like a product not a prototype.
            </h2>
          </div>
          <p className="max-w-xl text-pretty text-lg leading-8 text-muted-foreground">
            Inspired by the tighter rhythm and compositional clarity common in current AI SaaS sites, this section uses a bento layout to communicate capability, confidence, and trust at a glance.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description, eyebrow, className }) => (
            <div
              key={title}
              className={`premium-panel hover-lift group relative overflow-hidden rounded-[1.75rem] p-6 ${className}`}
            >
              <div className="absolute right-4 top-4 rounded-full border border-border/60 bg-background/70 p-2 text-muted-foreground transition-colors duration-300 group-hover:text-primary">
                <ArrowUpRight className="size-4" />
              </div>
              <div className="mb-10 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">{eyebrow}</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{title}</h3>
              <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">{description}</p>

              {title === "Retrieval before generation" && (
                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "Search", value: "Context shards" },
                    { label: "Rank", value: "Most relevant" },
                    { label: "Answer", value: "Source-shaped" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl bg-muted/60 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70">{item.label}</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {title === "Bring your own model access" && (
                <div className="mt-8 flex flex-wrap gap-2">
                  {["OpenRouter", "Model choice", "No lock-in"].map((item) => (
                    <span key={item} className="rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                      {item}
                    </span>
                  ))}
                </div>
              )}

              {title === "Effortless ingestion" && (
                <div className="mt-8 flex flex-wrap gap-2">
                  {["PDF", "Markdown", "Text", "HTML"].map((item) => (
                    <span key={item} className="rounded-full bg-primary/8 px-3 py-1.5 text-xs font-semibold text-primary">
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
