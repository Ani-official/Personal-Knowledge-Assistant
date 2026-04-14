"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const faqs = [
  {
    question: "What makes the answers feel more reliable than a normal chat bot?",
    answer:
      "EvidentiaAI is designed around retrieval-augmented generation. Instead of answering from general model memory alone, it first pulls from the context inside your uploaded files and shapes the response around that material.",
  },
  {
    question: "What document formats are supported?",
    answer:
      "The current workspace supports PDF, plain text (.txt), Markdown (.md), and HTML files. The upload flow is intentionally simple so people can start asking questions quickly.",
  },
  {
    question: "Can I ask follow-up questions without repeating the whole prompt?",
    answer:
      "Yes. The conversation is meant to feel iterative, so you can refine, compare, or go deeper into the same source material without restating every detail each time.",
  },
  {
    question: "Do I need my own API key?",
    answer:
      "No. The product works out of the box, and you can optionally connect your own OpenRouter key if you want broader model choice or tighter control over usage.",
  },
  {
    question: "Is the interface built for mobile as well as desktop?",
    answer:
      "Yes. The landing page and the product flow are responsive, with spacing, motion, and layout tuned to feel intentional on mobile, tablet, and desktop.",
  },
]

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="px-4 py-24 sm:px-6">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="premium-panel rounded-[2rem] p-8 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground/75">FAQ</p>
          <h2 className="mt-4 text-balance font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            The details people care about before they trust an AI workspace.
          </h2>
          <p className="mt-5 max-w-md text-lg leading-8 text-muted-foreground">
            The copy here now focuses on source fidelity, workflow clarity, and how the product behaves once real files are uploaded.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i

            return (
              <div
                key={faq.question}
                className={cn(
                  "premium-panel overflow-hidden rounded-[1.5rem] transition-all duration-300",
                  isOpen ? "border-primary/30 shadow-lg shadow-primary/10" : "border-border/60"
                )}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="text-sm font-semibold sm:text-base">{faq.question}</span>
                  <ChevronDown
                    className={cn(
                      "size-4 flex-shrink-0 text-muted-foreground transition-transform duration-200",
                      isOpen && "rotate-180 text-primary"
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-200",
                    isOpen ? "max-h-56" : "max-h-0"
                  )}
                >
                  <p className="border-t border-border/40 px-6 pb-6 pt-4 text-sm leading-7 text-muted-foreground">
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
