import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import HeroSection from "@/components/landing/hero"
import FeaturesSection from "@/components/landing/features"
import PricingSection from "@/components/landing/pricing"
import WhoIsItForSection from "@/components/landing/forWhom"
import Footer from "@/components/landing/footer"
import Navbar from "@/components/landing/navbar"
import FaqSection from "@/components/landing/faqsection"

export default function Home() {
  return (
    <div className="relative bg-gradient-to-br from-[#e0f2fe] via-white to-[#ede9fe] dark:from-[#0f172a] dark:via-black dark:to-[#1e293b]">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <WhoIsItForSection />
      {/* <PricingSection /> */}
      <FaqSection />
      <Footer />
    </div>
  )
}
