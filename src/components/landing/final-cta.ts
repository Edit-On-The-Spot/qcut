import type { Component } from "../../types"
import { iconSvg } from "../../lib/icons"

/**
 * Final call-to-action section for the landing page.
 * Displays a compelling CTA to encourage users to start editing.
 */
export function createFinalCTA(onStartEditing: () => void): Component {
  const section = document.createElement("section")
  section.className = "py-24 px-6"
  section.innerHTML = `
    <div class="max-w-3xl mx-auto text-center">
      <h2 class="heading-display">Ready to Edit?</h2>
      <p class="body-large mt-4 text-muted-foreground">No signup. No download. Just results.</p>
      <p class="text-muted-foreground mt-2">The Fastest Way to Edit Videos in Your Browser</p>

      <div class="mt-10">
        <button id="final-cta-btn"
          class="inline-flex items-center gap-3 px-10 py-5 bg-primary text-primary-foreground rounded-full font-semibold text-lg hover-lift hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 group">
          Start Editing Now
          ${iconSvg("ArrowRight", 20, "h-5 w-5 group-hover:translate-x-1 transition-transform")}
        </button>
      </div>
    </div>
  `

  const btn = section.querySelector("#final-cta-btn")!
  btn.addEventListener("click", onStartEditing)

  return {
    element: section,
    destroy: () => btn.removeEventListener("click", onStartEditing),
  }
}
