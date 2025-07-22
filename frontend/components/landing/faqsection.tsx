"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const faqs = [
  {
    question: "Is KnowAI free to use?",
    answer:
      "Yes! KnowAI is completely free. Just upload your documents and start chatting. No credit card or subscription required.",
  },
  {
    question: "What document formats are supported?",
    answer:
      "We support PDFs and Markdown (.md) documents. Support for DOCX and TXT is coming soon!",
  },
  {
    question: "Is my data secure?",
    answer:
      "Absolutely. Your documents are never shared. Everything is stored securely and processed only for your use.",
  },
  {
    question: "Can I use it on mobile?",
    answer:
      "Yes, KnowAI is fully responsive and works across all modern browsers on mobile, tablet, and desktop.",
  },
]

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section id="faq" className="py-20 px-4 max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
      <div className="space-y-4">
        {faqs.map((faq, i) => (
          <div
            key={i}
            className="border border-muted rounded-xl p-4 bg-muted/20 shadow-sm transition-all"
          >
            <button
              onClick={() => toggle(i)}
              className="flex justify-between items-center w-full text-left"
            >
              <span className="font-medium">{faq.question}</span>
              <ChevronDown
                className={cn(
                  "w-5 h-5 text-muted-foreground transition-transform duration-200",
                  openIndex === i && "rotate-180"
                )}
              />
            </button>
            <div
              className={cn(
                "mt-2 text-sm text-muted-foreground transition-all duration-200",
                openIndex !== i && "hidden"
              )}
            >
              {faq.answer}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
