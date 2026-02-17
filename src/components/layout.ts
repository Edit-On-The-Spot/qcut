import type { Component } from "../types"
import { createHeader } from "./header"
import { createFeatureRequestButton } from "./feature-request-button"

/**
 * Persistent layout shell containing header, main content area, and feature request FAB.
 * The router swaps content inside #page-content.
 */
export function createLayout(): Component {
  const container = document.createElement("div")

  const header = createHeader()
  container.appendChild(header.element)

  const main = document.createElement("main")
  main.id = "page-content"
  container.appendChild(main)

  const fab = createFeatureRequestButton()
  container.appendChild(fab.element)

  return {
    element: container,
    destroy: () => {
      header.destroy()
      fab.destroy()
    },
  }
}
