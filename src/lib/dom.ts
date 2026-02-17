/** Creates an HTML element with optional attributes set via properties. */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string>
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (key === "className") {
        el.className = value
      } else if (key === "ariaLabel") {
        el.setAttribute("aria-label", value)
      } else if (key === "innerHTML") {
        el.innerHTML = value
      } else {
        el.setAttribute(key, value)
      }
    }
  }
  return el
}

/**
 * Creates an HTML fragment from a template string and returns the container.
 * Useful for building complex DOM structures from HTML strings.
 */
export function html(strings: TemplateStringsArray, ...values: unknown[]): HTMLElement {
  const template = document.createElement("template")
  template.innerHTML = strings.reduce(
    (result, str, i) => result + str + (values[i] ?? ""),
    ""
  )
  const content = template.content
  // Return first element child, or wrap in a div
  if (content.children.length === 1) {
    return content.firstElementChild as HTMLElement
  }
  const wrapper = document.createElement("div")
  wrapper.append(...content.childNodes)
  return wrapper
}
