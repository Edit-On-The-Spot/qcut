import type { Component } from "../../types"
import { iconSvg } from "../../lib/icons"

/**
 * Footer section for the landing page.
 * Displays logo, tagline, links, and copyright information.
 */
export function createFooter(): Component {
  const footer = document.createElement("footer")
  footer.className = "py-12 px-6 border-t"
  footer.innerHTML = `
    <div class="max-w-5xl mx-auto">
      <div class="flex flex-col md:flex-row items-center justify-between gap-6">
        <div class="flex flex-col items-center md:items-start gap-2">
          <img src="/qcut-logo.png" alt="Qcut" class="h-10 w-auto dark:hidden" width="90" height="36" />
          <img src="/qcut-logo-on-dark.png" alt="Qcut" class="h-10 w-auto hidden dark:block" width="80" height="32" />
          <span class="text-sm text-muted-foreground text-center md:text-left">
            Simple video editing in your browser.<br />
            Your files. Your device. Your privacy.
          </span>
        </div>

        <div class="flex items-center gap-6">
          <a href="/terms" data-link class="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</a>
          <a href="/privacy" data-link class="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</a>
          <a href="/cookies" data-link class="text-sm text-muted-foreground hover:text-foreground transition-colors">Cookies</a>
          <a href="/contact" data-link class="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</a>
          <div class="flex items-center gap-4 ml-4">
            <a href="https://github.com/Edit-On-The-Spot/qcut" target="_blank" rel="noopener noreferrer" class="text-muted-foreground hover:text-foreground transition-colors" aria-label="GitHub">
              ${iconSvg("Github", 20, "h-5 w-5")}
            </a>
            <a href="https://x.com/editonthespot" target="_blank" rel="noopener noreferrer" class="text-muted-foreground hover:text-foreground transition-colors" aria-label="Twitter">
              ${iconSvg("Twitter", 20, "h-5 w-5")}
            </a>
          </div>
        </div>
      </div>

      <div class="mt-8 pt-6 border-t text-center flex flex-col gap-2">
        <p class="text-sm text-muted-foreground">
          Qcut is brought to you by <a href="https://www.editonthespot.com/" target="_blank" rel="noopener noreferrer" class="hover:text-foreground transition-colors font-medium">Edit on the Spot</a>
        </p>
        <p class="text-xs text-muted-foreground">
          Copyright &copy; 2026 Edit on the Spot.
        </p>
      </div>
    </div>
  `

  return { element: footer, destroy: () => {} }
}
