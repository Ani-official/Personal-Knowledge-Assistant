import { BadgeCheck, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from "@/components/ui/card"

const plans = [
  {
    title: "Free",
    price: "$0",
    icon: BadgeCheck,
    features: ["1 PDF upload/day", "Basic chat with docs", "Light & dark mode"],
    cta: "Get Started"
  },
  {
    title: "Pro",
    price: "$9/mo",
    icon: Star,
    features: ["Unlimited uploads", "Priority chat speed", "Export answers"],
    cta: "Upgrade"
  }
]

export default function PricingSection() {
  return (
    <section id="pricing" className="py-20 px-4 max-w-6xl mx-auto text-center">
      <h2 className="text-3xl font-bold mb-4">Simple Pricing</h2>
      <p className="text-muted-foreground mb-10">Choose a plan that works for you. Cancel anytime.</p>
      <div className="grid md:grid-cols-2 gap-6">
        {plans.map(({ title, price, icon: Icon, features, cta }) => (
          <Card key={title} className="bg-background shadow-md">
            <CardHeader className="flex flex-col items-center gap-2">
              <Icon className="w-8 h-8 text-primary" />
              <CardTitle>{title}</CardTitle>
              <CardDescription className="text-3xl font-bold">{price}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-left space-y-2">
                {features.map((f) => (
                  <li key={f} className="before:content-['✓'] before:text-green-500 before:mr-2">
                    {f}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="pt-4 justify-center">
              <Button variant={title === "Pro" ? "default" : "outline"}>{cta}</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  )
}