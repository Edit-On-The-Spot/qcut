import type { Component } from "../../types"
import { iconSvg } from "../../lib/icons"

const steps = [
  { number: "1", iconName: "Upload", title: "Drop your video", description: "Drag a file or click to upload. Supports MP4, WebM, and more." },
  { number: "2", iconName: "Wand2", title: "Make your edits", description: "Trim, convert, compress — whatever you need. It's that simple." },
  { number: "3", iconName: "Download", title: "Download", description: "One click and it's yours. No account. No watermark. No catch." },
]

/**
 * How It Works section for the landing page.
 * Displays a 3-step process for using Qcut.
 */
export function createHowItWorks(): Component {
  const section = document.createElement("section")
  section.className = "py-24 px-6"

  const stepsHtml = steps
    .map(
      (step, index) => `
    <div class="relative text-center">
      ${index < steps.length - 1 ? '<div class="hidden md:block absolute top-10 left-[60%] w-[80%] h-px bg-border"></div>' : ""}
      <div class="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
        ${iconSvg(step.iconName, 32, "h-8 w-8 text-primary")}
        <span class="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
          ${step.number}
        </span>
      </div>
      <h3 class="text-xl font-semibold mb-2">${step.title}</h3>
      <p class="text-muted-foreground">${step.description}</p>
    </div>
  `
    )
    .join("")

  section.innerHTML = `
    <div class="max-w-4xl mx-auto">
      <div class="text-center mb-16">
        <h2 class="heading-1">How It Works</h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        ${stepsHtml}
      </div>
    </div>
  `

  return { element: section, destroy: () => {} }
}
