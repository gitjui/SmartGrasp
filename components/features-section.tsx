"use client"

import Image from "next/image"
import { MistakeReport } from "@/components/mistake-report"

const features = [
  {
    step: 1,
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-JSCJ64jsZikff7PKe8pV8VOcWklKXb.png",
    caption: "write like real exam steps",
    alt: "SmartGrasp.ai practice mode showing handwritten math solution steps for a geometry problem",
    type: "image" as const
  },
  {
    step: 2,
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-VeYQmmy1LEfH4WSC4KgqAiFQiNbhXn.png",
    caption: "get real time hints in practice mode",
    alt: "SmartGrasp.ai practice mode with Ask Hint button for trigonometry problem",
    type: "image" as const
  },
  {
    step: 3,
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-H4SCsjZYztSkXjx5HyzuDMgCMsWvRG.png",
    caption: "get exact working",
    alt: "SmartGrasp.ai showing mistake detection with corrections in green and error report",
    type: "image" as const
  },
  {
    step: 4,
    caption: "see detailed report of all mistakes",
    type: "component" as const
  },
]

export function FeaturesSection() {
  return (
    <section className="relative z-10 px-6 py-16">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-24">
          {features.map((feature, index) => (
            <FeatureCard 
              key={feature.step} 
              {...feature} 
              reverse={index % 2 === 1}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function FeatureCard({ 
  step, 
  image, 
  caption, 
  alt,
  type,
  reverse 
}: { 
  step: number
  image?: string
  caption: string
  alt?: string
  type: "image" | "component"
  reverse?: boolean
}) {
  return (
    <div className={`flex flex-col ${reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-8 lg:gap-16`}>
      {/* Step Number */}
      <div className="flex-shrink-0">
        <span className="text-8xl lg:text-9xl font-light text-gray-300 select-none">
          {step}
        </span>
      </div>
      
      {/* Image or Component */}
      <div className="flex-1 w-full">
        {type === "image" && image ? (
          <div className="relative rounded-2xl overflow-hidden shadow-xl border border-gray-100 bg-white">
            <Image
              src={image}
              alt={alt || ""}
              width={1200}
              height={800}
              className="w-full h-auto object-cover"
            />
          </div>
        ) : (
          <MistakeReport />
        )}
      </div>
      
      {/* Caption */}
      <div className="flex-shrink-0 lg:w-64">
        <p className="text-2xl lg:text-3xl font-semibold text-gray-400 text-center lg:text-left">
          {caption}
        </p>
      </div>
    </div>
  )
}
