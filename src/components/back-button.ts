import type { Component } from "../types"
import { navigate } from "../router"
import { iconSvg } from "../lib/icons"

/**
 * Reusable back button component for navigation.
 */
export function createBackButton(href = "/actions", label = "Back"): Component {
  const button = document.createElement("button")
  button.className = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
  button.innerHTML = `${iconSvg("ArrowLeft", 16, "w-4 h-4 mr-2")} ${label}`

  const handleClick = () => navigate(href)
  button.addEventListener("click", handleClick)

  return {
    element: button,
    destroy: () => button.removeEventListener("click", handleClick),
  }
}
