import type { Component } from "../../types"

/**
 * Why Qcut section for the landing page.
 * Explains the value proposition and unique selling points.
 */
export function createWhyQcut(): Component {
  const section = document.createElement("section")
  section.className = "py-20 px-6"
  section.innerHTML = `
    <div class="max-w-3xl mx-auto text-center">
      <h2 class="heading-1">Why Qcut?</h2>
      <p class="heading-3 mt-4 text-muted-foreground">Edit videos without the headache.</p>
      <p class="body-large mt-6 text-muted-foreground leading-relaxed">
        No confusing timelines. No subscription fees. No privacy concerns. Qcut runs entirely in
        your browser, so your videos never touch our servers.
      </p>
      <p class="text-muted-foreground mt-4 italic">
        Perfect for quick edits when you don't want to open heavyweight software.
      </p>
    </div>
  `
  return { element: section, destroy: () => {} }
}
