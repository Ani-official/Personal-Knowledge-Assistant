import {
  UploadCloud,
  Zap,
  Bot,
  Lock,
  FileText,
  Globe
} from "lucide-react"

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description:
      "Instant document processing and AI responses. Get answers in seconds, not minutes.",
  },
  {
    icon: UploadCloud,
    title: "Effortless Uploads",
    description:
      "Drag-and-drop PDFs, notes, or articles. No formatting needed—just upload and go.",
  },
  {
    icon: Bot,
    title: "AI Assistant",
    description:
      "Ask follow-up questions like you're chatting with ChatGPT, but about your documents.",
  },
  {
    icon: Lock,
    title: "Private & Secure",
    description:
      "Your documents are processed securely and never shared. You stay in control.",
  },
  {
    icon: FileText,
    title: "Multi-format Support",
    description:
      "Supports PDF and Markdown. Built for real-world knowledge sources.",
  },
  {
    icon: Globe,
    title: "No Vendor Lock-in",
    description: "Use your own API keys. Switch between AI providers freely without restrictions.",
  },
]

export default function FeaturesSection() {
  return (
    <section id="features" className="py-20 px-4 max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-12">
        Why Choose KnowAI?
      </h2>
      <div className="grid md:grid-cols-3 gap-6">
        {features.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="flex flex-col items-center text-center p-6 rounded-xl border border-muted shadow-sm bg-muted/30 hover:bg-muted transition"
          >
            <Icon className="w-6 h-6 text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-muted-foreground text-sm">{description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
