"use client"

import { useEffect, useRef } from "react"
import { driver, type Driver } from "driver.js"

const STORAGE_KEY = "onboarding_v3_completed"

interface Props {
  triggerKey?: number
  onOpenApiKey?: () => void
  onComplete?: () => void
}

export default function OnboardingTour({ triggerKey = 0, onOpenApiKey, onComplete }: Props) {
  const driverRef = useRef<Driver | null>(null)

  const startTour = () => {
    driverRef.current?.destroy()

    // Expand the API key section before the tour starts so the element
    // is rendered and measurable when Driver.js reaches that step.
    onOpenApiKey?.()

    const driverObj = driver({
      animate: true,
      showProgress: true,
      progressText: "{{current}} of {{total}}",
      nextBtnText: "Next &rarr;",
      prevBtnText: "&larr; Back",
      doneBtnText: "Get started",
      overlayOpacity: 0.65,
      popoverClass: "evidentia-popover",
      steps: [
        {
          popover: {
            title: "Welcome to EvidentiaAI",
            description:
              "Your documents, ready to answer questions. This quick tour covers every feature — takes about 60 seconds.",
            align: "center",
          },
        },
        {
          element: "#tour-apikey",
          popover: {
            title: "Set Your API Key",
            description:
              "Add your <strong>OpenRouter</strong> key to unlock any AI model — GPT-4o, Claude, Llama, Gemini, and more. Free models are available without a key.",
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-upload",
          popover: {
            title: "Upload a Document",
            description:
              'Click <strong>New Document</strong> to upload a PDF, TXT, Markdown, or HTML file up to 10 MB. It\'s parsed, chunked, and indexed automatically.',
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-doclist",
          popover: {
            title: "Chat with One Document",
            description:
              "Select any document from this list. Every answer is pulled directly from that file — nothing fabricated. If it's not in the document, the AI will say so.",
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-workspace",
          popover: {
            title: "Workspace Mode",
            description:
              "Click <strong>All Documents</strong> to query your entire library at once. Each answer cites exactly which document it came from.",
            side: "right",
            align: "start",
          },
        },
      ],
      onDestroyed: () => {
        localStorage.setItem(STORAGE_KEY, "1")
        onComplete?.()
      },
    })

    driverRef.current = driverObj

    // Small delay lets React flush the API key section open before Driver.js
    // measures element positions.
    setTimeout(() => driverObj.drive(), 120)
  }

  // Auto-start on first visit
  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) startTour()
    return () => { driverRef.current?.destroy() }
  }, [])

  // Re-trigger when navbar "Tour" button increments the key
  useEffect(() => {
    if (triggerKey > 0) startTour()
  }, [triggerKey])

  return null
}

export function resetOnboarding() {
  localStorage.removeItem(STORAGE_KEY)
}