import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function HeroSection() {
  return (
    <section className="py-32 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="animate-fade-in-up">
          <div className="backdrop-blur-lg text-center">
            <div className="p-8">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from bg-blue-500 to via-purple-500 to-pink-400">Your Personal Knowledge Assistant</h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-6">
                Upload, search, and chat with your documents instantly. Powered by AI and built for productivity.
              </p>
              <Link href="/dashboard">
                <Button size="lg" className="gap-2">
                  Get Started <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}