import type { Component } from "../types"
import { iconSvg } from "../lib/icons"

/**
 * Loading state component for when video data is not yet available.
 */
export function createVideoLoading(message = "Loading video..."): Component {
  const el = document.createElement("div")
  el.className = "max-w-6xl mx-auto flex items-center justify-center min-h-[400px]"
  el.innerHTML = `
    <div class="text-center space-y-4">
      ${iconSvg("Loader2", 32, "w-8 h-8 animate-spin mx-auto text-muted-foreground")}
      <p class="text-muted-foreground">${message}</p>
    </div>
  `
  return { element: el, destroy: () => {} }
}
