import {
  BookOpenCheck,
  BriefcaseBusiness,
  GraduationCap,
  SearchCheck,
  Shapes,
} from "lucide-react"

const audience = [
  {
    icon: GraduationCap,
    title: "Research and study",
    description:
      "Turn lecture notes, source readings, and long PDFs into a focused study surface that answers from the actual material.",
    points: ["Summaries from assigned readings", "Fast revision before exams"],
    layout: "featured",
  },
  {
    icon: BriefcaseBusiness,
    title: "Client and internal work",
    description:
      "Interrogate proposals, contracts, policies, and strategy decks without hunting through tabs or skimming 70 pages manually.",
    points: ["Ask clause-specific questions", "Review decks and reports faster"],
    layout: "compact",
  },
  {
    icon: BookOpenCheck,
    title: "Personal knowledge archives",
    description:
      "Build a polished second-brain workflow where uploaded files become an answerable archive instead of a folder you rarely revisit.",
    points: ["Turn saved files into recallable context", "Keep a calmer long-term knowledge system"],
    layout: "compact",
  },
]

export default function WhoIsItForSection() {
  const [featured, ...secondary] = audience
  const FeaturedIcon = featured.icon

  return (
    <section id="audience" className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-5 lg:grid-cols-[0.88fr_1.12fr]">
          <div className="premium-panel rounded-[2rem] p-8 sm:p-10">
            <div className="flex size-14 items-center justify-center rounded-3xl bg-primary/10 text-primary">
              <Shapes className="size-6" />
            </div>
            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground/75">Use cases</p>
            <h2 className="mt-4 text-balance font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Designed for people who need trustworthy answers from dense documents.
            </h2>
            <p className="mt-5 max-w-lg text-lg leading-8 text-muted-foreground">
              The product story is simple: upload a file, ask a clear question, and get a grounded answer that reflects what is actually in the document.
            </p>

            <div className="mt-10 grid gap-3">
              {[
                "Premium interface that feels calm during deep work",
                "Fast enough for daily operational questions",
                "Structured for personal archives and team docs alike",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                  <SearchCheck className="size-4 text-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-5">
            <div className="premium-panel hover-lift rounded-[1.75rem] p-7 sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-xl">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-accent/30 text-accent-foreground">
                    <FeaturedIcon className="size-5" />
                  </div>
                  <h3 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">{featured.title}</h3>
                  <p className="mt-4 max-w-lg text-sm leading-7 text-muted-foreground sm:text-base">
                    {featured.description}
                  </p>
                </div>
                <div className="grid gap-3 sm:min-w-60 sm:self-end sm:pb-1">
                  {featured.points.map((point) => (
                    <div key={point} className="rounded-2xl bg-muted/60 px-4 py-3 text-sm font-medium text-muted-foreground">
                      {point}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {secondary.map(({ icon: Icon, title, description, points }) => (
                <div
                  key={title}
                  className="premium-panel hover-lift rounded-[1.75rem] p-7"
                >
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-accent/30 text-accent-foreground">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold tracking-tight">{title}</h3>
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">{description}</p>
                  <div className="mt-6 grid gap-2">
                    {points.map((point) => (
                      <div key={point} className="rounded-2xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                        {point}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
