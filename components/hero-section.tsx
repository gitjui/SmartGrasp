"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FeaturesSection } from "@/components/features-section"

export function HeroSection() {
  return (
    <div className="relative z-10 flex flex-col w-full">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <Logo />
        <Button asChild variant="outline">
          <Link href="/login">Login</Link>
        </Button>
      </header>

      {/* Hero Content */}
      <section className="flex flex-col items-center px-6 pt-12 pb-16">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center text-foreground max-w-4xl leading-tight text-balance">
          Learn by Doing, Tutor for Every Student, Anywhere at Anytime
        </h1>

        <h2 className="mt-10 text-3xl md:text-4xl lg:text-5xl font-bold text-center text-[#6366f1]">
          Get AL1 in Maths
        </h2>

        <Button
          asChild
          size="lg"
          className="mt-8 bg-[#6366f1] hover:bg-[#5558e3] text-white text-lg px-8 py-6 rounded-xl font-medium"
        >
          <Link href="/canvas">Get started for free</Link>
        </Button>
      </section>

      {/* Features Section */}
      <FeaturesSection />
    </div>
  )
}

function Logo() {
  return (
    <div className="text-xl font-semibold italic">
      <span className="text-[#6366f1]">S</span>
      <span className="text-[#f59e0b]">m</span>
      <span className="text-[#22c55e]">a</span>
      <span className="text-[#ef4444]">r</span>
      <span className="text-[#3b82f6]">t</span>
      <span className="text-[#6366f1]">G</span>
      <span className="text-gray-700">rasp.ai</span>
    </div>
  )
}
