import { GraduationCap, BriefcaseBusiness, BookOpenCheck } from "lucide-react"

const audience = [
  {
    icon: GraduationCap,
    title: "Students",
    description:
      "Turn lecture notes, textbooks, and research papers into a smart study assistant. Get to the point faster.",
    iconColor: "text-violet-500",
    iconBg: "bg-violet-500/10",
  },
  {
    icon: BriefcaseBusiness,
    title: "Professionals",
    description:
      "Quickly navigate technical docs, legal agreements, and business reports. Save hours every week.",
    iconColor: "text-blue-500",
    iconBg: "bg-blue-500/10",
  },
  {
    icon: BookOpenCheck,
    title: "Curious Learners",
    description:
      "Explore articles, essays, and research without reading every word. Ask questions and get clarity.",
    iconColor: "text-green-500",
    iconBg: "bg-green-500/10",
  },
]

export default function WhoIsItForSection() {
  return (
    <section id="audience" className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Built for everyone
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Whether you're a student, a professional, or just someone who loves learning — KnowAI works for you.
          </p>
        </div>

        {/* Cards */}
        <div className="grid sm:grid-cols-3 gap-6">
          {audience.map(({ icon: Icon, title, description, iconColor, iconBg }) => (
            <div
              key={title}
              className="bg-card border border-border/60 rounded-2xl p-7 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
            >
              <div className={`w-12 h-12 ${iconBg} ${iconColor} rounded-2xl flex items-center justify-center mb-5`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
