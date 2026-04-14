import { UploadCloud, Zap, Bot, Lock, FileText, Globe } from "lucide-react"

const features = [
  {
    icon: Zap,
    title: "Instant answers",
    description: "Get precise answers from your documents in seconds. No scrolling through pages.",
    iconColor: "text-amber-500",
    iconBg: "bg-amber-500/10",
  },
  {
    icon: UploadCloud,
    title: "Effortless uploads",
    description: "Drag-and-drop PDFs, notes, or articles. No formatting needed — just upload and go.",
    iconColor: "text-blue-500",
    iconBg: "bg-blue-500/10",
  },
  {
    icon: Bot,
    title: "Context-aware AI",
    description: "Ask follow-up questions naturally. The AI understands your document's full context.",
    iconColor: "text-violet-500",
    iconBg: "bg-violet-500/10",
  },
  {
    icon: Lock,
    title: "Private & secure",
    description: "Your documents are processed securely and never shared. You stay in full control.",
    iconColor: "text-green-500",
    iconBg: "bg-green-500/10",
  },
  {
    icon: FileText,
    title: "Multi-format support",
    description: "Supports PDF, TXT, Markdown, and HTML. Built for real-world knowledge sources.",
    iconColor: "text-rose-500",
    iconBg: "bg-rose-500/10",
  },
  {
    icon: Globe,
    title: "Bring your own key",
    description: "Use your own API key. Switch AI providers freely — no lock-in, ever.",
    iconColor: "text-cyan-500",
    iconBg: "bg-cyan-500/10",
  },
]

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-4 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Everything you need
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            A complete toolkit for understanding documents with AI — fast, private, and flexible.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, description, iconColor, iconBg }) => (
            <div
              key={title}
              className="group bg-card border border-border/60 rounded-2xl p-6 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
            >
              <div className={`w-10 h-10 ${iconBg} ${iconColor} rounded-xl flex items-center justify-center mb-4`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
