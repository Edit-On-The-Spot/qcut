import type { Component } from "../../types"
import { iconSvg } from "../../lib/icons"

/**
 * Hero section for the landing page.
 * Displays main headline, value proposition, and CTA button.
 */
export function createHero(onSelectVideo: () => void): Component {
  const section = document.createElement("section")
  section.className = "pt-32 pb-8 px-6"
  section.innerHTML = `
    <div class="max-w-4xl mx-auto text-center">
      <h1 class="heading-display text-balance">
        Cut, Convert &amp; Edit Videos
        <br />
        <span class="text-primary">Right in Your Browser</span>
        <span class="ml-3 inline-flex items-center px-3 py-1 rounded-full text-lg font-semibold bg-primary text-primary-foreground">
          Free
        </span>
      </h1>

      <p class="body-large mt-6 max-w-2xl mx-auto text-balance opacity-0 animate-fade-in animation-delay-100">
        No software to install. No account needed. No watermarks.
      </p>

      <p class="text-muted-foreground mt-3 max-w-2xl mx-auto text-balance opacity-0 animate-fade-in" style="animation-delay:150ms">
        Cut, trim, resize, convert formats, extract audio, create GIFs, and export high-quality
        videos — Lightning-fast, lossless video editing.
      </p>

      <div class="mt-10 opacity-0 animate-fade-in animation-delay-200">
        <button id="hero-cta"
          class="inline-flex items-center gap-3 px-10 py-5 bg-primary text-primary-foreground rounded-full font-semibold text-lg hover-lift hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
          ${iconSvg("Upload", 20, "h-5 w-5")}
          Select Video
        </button>
      </div>

      <div class="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 max-w-2xl mx-auto opacity-0 animate-fade-in animation-delay-300">
        <div class="flex items-center justify-center sm:justify-end gap-2 text-base text-muted-foreground">
          ${iconSvg("Lock", 16, "h-4 w-4 text-primary")}
          <span>100% Private — files stay on your device</span>
        </div>
        <div class="flex items-center justify-center sm:justify-start gap-2 text-base text-muted-foreground">
          ${iconSvg("Zap", 16, "h-4 w-4 text-primary")}
          <span>Lightning fast — no upload wait times</span>
        </div>
        <div class="flex items-center justify-center sm:justify-end gap-2 text-base text-muted-foreground">
          ${iconSvg("Target", 16, "h-4 w-4 text-primary")}
          <span>No watermarks</span>
        </div>
        <div class="flex items-center justify-center sm:justify-start gap-2 text-base text-muted-foreground">
          ${iconSvg("UserX", 16, "h-4 w-4 text-primary")}
          <span>No account required</span>
        </div>
      </div>
    </div>
  `

  const ctaBtn = section.querySelector("#hero-cta")!
  ctaBtn.addEventListener("click", onSelectVideo)

  return {
    element: section,
    destroy: () => ctaBtn.removeEventListener("click", onSelectVideo),
  }
}
