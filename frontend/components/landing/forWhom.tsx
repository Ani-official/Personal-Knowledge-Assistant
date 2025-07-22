"use client"

import { GraduationCap, BriefcaseBusiness, BookOpenCheck } from "lucide-react"

const audience = [
  {
    icon: GraduationCap,
    title: "Students",
    description: "Turn class notes and PDFs into a smart study assistant.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Professionals",
    description: "Quickly understand technical docs, legal papers, or reports.",
  },
  {
    icon: BookOpenCheck,
    title: "Curious Learners",
    description: "Ask anything from articles, essays, and research papers.",
  },
]

export default function WhoIsItForSection() {
  return (
    <section id="audience" className="py-20 px-4 max-w-5xl mx-auto text-center">
      <h2 className="text-3xl font-bold mb-10">Who Is KnowAI For?</h2>
      <div className="grid gap-6 md:grid-cols-3 text-left">
        {audience.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="bg-muted/30 p-6 rounded-xl shadow-sm border border-muted dark:border-zinc-800 text-center"
          >
            <Icon className="w-8 h-8 text-primary mb-4 mx-auto" />
            <h3 className="font-semibold text-lg mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
