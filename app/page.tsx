import { HeroSection } from "@/components/hero-section"
import { AuroraBackground } from "@/components/ui/aurora-background"

export default function Home() {
  return (
    <AuroraBackground className="bg-white">
      <HeroSection />
    </AuroraBackground>
  )
}
