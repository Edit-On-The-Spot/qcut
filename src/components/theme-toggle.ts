import { createElement as lucideCreateElement, Sun, Moon } from "lucide"
import type { Component } from "../types"

/** Gets the current theme, defaulting to system preference. */
function getTheme(): "light" | "dark" {
  const saved = localStorage.getItem("theme") as "light" | "dark" | null
  if (saved) return saved
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

/** Applies a theme to the document and persists it. */
function applyTheme(theme: "light" | "dark"): void {
  document.documentElement.classList.toggle("dark", theme === "dark")
  localStorage.setItem("theme", theme)
}

/**
 * Theme toggle button that switches between light and dark mode.
 * Persists preference to localStorage.
 */
export function createThemeToggle(): Component {
  let currentTheme = getTheme()
  applyTheme(currentTheme)

  const button = document.createElement("button")
  button.className =
    "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 w-9"
  button.setAttribute("aria-label", "Toggle theme")

  function render(): void {
    button.innerHTML = ""
    const iconNode = currentTheme === "light" ? Sun : Moon
    const svg = lucideCreateElement(iconNode) as unknown as SVGSVGElement
    svg.setAttribute("width", "20")
    svg.setAttribute("height", "20")
    svg.classList.add("h-5", "w-5")
    button.appendChild(svg)
  }

  render()

  const handleClick = () => {
    currentTheme = currentTheme === "light" ? "dark" : "light"
    applyTheme(currentTheme)
    render()
  }

  button.addEventListener("click", handleClick)

  return {
    element: button,
    destroy: () => button.removeEventListener("click", handleClick),
  }
}
