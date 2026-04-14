"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const faqs = [
  {
    question: "Is KnowAI free to use?",
    answer:
      "Yes — KnowAI is completely free. Upload your documents and start chatting immediately. No credit card or subscription required.",
  },
  {
    question: "What document formats are supported?",
    answer:
      "We support PDF, plain text (.txt), Markdown (.md), and HTML files. More formats are on the roadmap.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Absolutely. Your documents are processed only to answer your questions and are never shared with third parties. You can delete them any time.",
  },
  {
    question: "Do I need my own API key?",
    answer:
      "No — KnowAI works out of the box. Optionally, you can add your own OpenRouter API key to get access to more AI models and remove rate limits.",
  },
  {
    question: "Can I use it on mobile?",
    answer:
      "Yes. KnowAI is fully responsive and works smoothly on any screen size — mobile, tablet, and desktop.",
  },
]

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section id="faq" className="py-24 px-4 bg-muted/30">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Frequently asked questions
          </h2>
          <p className="text-muted-foreground">
            Still have questions? Reach out anytime.
          </p>
        </div>

        {/* Accordion */}
        <div className="space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i
            return (
              <div
                key={i}
                className={cn(
                  "bg-card border rounded-xl overflow-hidden transition-all duration-200",
                  isOpen ? "border-primary/30 shadow-sm shadow-primary/10" : "border-border/60"
                )}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex justify-between items-center w-full text-left px-5 py-4 gap-4"
                >
                  <span className="font-medium text-sm sm:text-base">{faq.question}</span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200",
                      isOpen && "rotate-180 text-primary"
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-200",
                    isOpen ? "max-h-48" : "max-h-0"
                  )}
                >
                  <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
                    {faq.answer}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
