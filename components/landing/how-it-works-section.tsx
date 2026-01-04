"use client"

import { Upload, Wand2, Download } from "lucide-react"

const steps = [
  {
    number: "1",
    icon: Upload,
    title: "Drop your video",
    description: "Drag a file or click to upload. Supports MP4, WebM, and more.",
  },
  {
    number: "2",
    icon: Wand2,
    title: "Make your edits",
    description: "Trim, convert, compress — whatever you need. It's that simple.",
  },
  {
    number: "3",
    icon: Download,
    title: "Download",
    description: "One click and it's yours. No account. No watermark. No catch.",
  },
]

/**
 * How It Works section for the landing page.
 * Displays a 3-step process for using QCut.
 */
export const HowItWorksSection = () => {
  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="heading-1">How It Works</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={step.number} className="relative text-center">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px bg-border" />
              )}

              {/* Step number circle */}
              <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
                <step.icon className="h-8 w-8 text-primary" />
                <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                  {step.number}
                </span>
              </div>

              <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
