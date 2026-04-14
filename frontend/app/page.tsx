import HeroSection from "@/components/landing/hero"
import FeaturesSection from "@/components/landing/features"
import WhoIsItForSection from "@/components/landing/forWhom"
import Footer from "@/components/landing/footer"
import Navbar from "@/components/landing/navbar"
import FaqSection from "@/components/landing/faqsection"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <WhoIsItForSection />
      <FaqSection />
      <Footer />
    </div>
  )
}
