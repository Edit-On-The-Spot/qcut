import type { Component } from "../types"
import { navigate, getCurrentPath } from "../router"
import { subscribe } from "../store"
import { createThemeToggle } from "./theme-toggle"

/**
 * Navigation header component.
 * Displays app logo with backdrop blur effect, theme toggle, and conditional Home link.
 */
export function createHeader(): Component {
  const header = document.createElement("header")
  header.className = "fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b"

  const themeToggle = createThemeToggle()

  header.innerHTML = `
    <div class="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <a href="/" data-link class="flex items-center gap-2">
          <picture class="dark:hidden">
            <source srcset="/qcut-logo.webp" type="image/webp" />
            <img src="/qcut-logo.png" alt="Qcut" class="h-9 w-auto" width="80" height="32" />
          </picture>
          <picture class="hidden dark:block">
            <source srcset="/qcut-logo-on-dark.webp" type="image/webp" />
            <img src="/qcut-logo-on-dark.png" alt="Qcut" class="h-9 w-auto" width="80" height="32" />
          </picture>
        </a>
        <a href="https://www.editonthespot.com/" target="_blank" rel="noopener noreferrer" class="text-[10px] font-medium text-muted-foreground/70 hover:text-foreground transition-colors hidden sm:inline-block pt-1">
          Powered by Edit on the Spot
        </a>
      </div>
      <div class="flex items-center gap-4" id="header-right"></div>
    </div>
  `

  const rightContainer = header.querySelector("#header-right")!
  rightContainer.appendChild(themeToggle.element)

  // Home link - shown when not on landing page
  const homeLink = document.createElement("a")
  homeLink.href = "/"
  homeLink.setAttribute("data-link", "")
  homeLink.className = "text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
  homeLink.textContent = "Home"

  function updateHomeLink(): void {
    const isLanding = getCurrentPath() === "/"
    if (isLanding && homeLink.parentElement) {
      homeLink.remove()
    } else if (!isLanding && !homeLink.parentElement) {
      rightContainer.appendChild(homeLink)
    }
  }

  // Update on initial render and state changes
  // We use a MutationObserver on title to detect route changes
  const titleObserver = new MutationObserver(updateHomeLink)
  titleObserver.observe(document.querySelector("title")!, { childList: true })

  // Also check after a short delay for the initial render
  requestAnimationFrame(updateHomeLink)

  return {
    element: header,
    destroy: () => {
      themeToggle.destroy()
      titleObserver.disconnect()
    },
  }
}
