import type { Component } from "../types"
import { iconSvg } from "../lib/icons"

const MAX_EMAIL_LENGTH = 254
const MAX_MESSAGE_LENGTH = 5000
const CONTACT_API_URL = import.meta.env.VITE_CONTACT_API_URL as string | undefined

/**
 * Floating action button that opens a feature request dialog.
 * Submits to the contact form API with auto-filled name and subject fields.
 */
export function createFeatureRequestButton(): Component {
  // FAB button
  const fab = document.createElement("button")
  fab.className =
    "fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
  fab.setAttribute("aria-label", "Request a feature")
  fab.innerHTML = iconSvg("Lightbulb", 20)

  // Dialog
  const dialog = document.createElement("dialog")
  dialog.className =
    "rounded-lg border bg-background p-6 shadow-lg backdrop:bg-black/50 w-full max-w-md"
  dialog.innerHTML = `
    <div class="space-y-2 mb-4">
      <h2 class="text-lg font-semibold leading-none tracking-tight">Request a Feature</h2>
      <p class="text-sm text-muted-foreground">Have an idea for Qcut? We'd love to hear it.</p>
    </div>
    <form class="space-y-4" id="feature-form">
      <div class="space-y-2">
        <label for="feature-email" class="text-sm font-medium leading-none">Email</label>
        <input id="feature-email" name="email" type="email" required
          maxlength="${MAX_EMAIL_LENGTH}"
          placeholder="your.email@example.com"
          class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
        <p class="text-sm text-red-500 hidden" id="email-error"></p>
      </div>
      <div class="space-y-2">
        <label for="feature-message" class="text-sm font-medium leading-none">What feature would you like?</label>
        <textarea id="feature-message" name="message" required
          minlength="10" maxlength="${MAX_MESSAGE_LENGTH}"
          placeholder="Describe the feature you'd like to see..."
          class="w-full min-h-[120px] px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"></textarea>
        <p class="text-sm text-red-500 hidden" id="message-error"></p>
      </div>
      <div id="submit-status" class="hidden p-3 rounded-md text-sm"></div>
      <button type="submit" id="submit-btn"
        class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full">
        Submit Feature Request
      </button>
    </form>
  `
  document.body.appendChild(dialog)

  const form = dialog.querySelector("#feature-form") as HTMLFormElement
  const submitBtn = dialog.querySelector("#submit-btn") as HTMLButtonElement
  const statusDiv = dialog.querySelector("#submit-status") as HTMLDivElement

  // Close on backdrop click
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close()
  })

  // Close on Escape is built into <dialog>

  fab.addEventListener("click", () => {
    statusDiv.classList.add("hidden")
    dialog.showModal()
  })

  form.addEventListener("submit", async (e) => {
    e.preventDefault()
    const formData = new FormData(form)
    const email = (formData.get("email") as string).trim()
    const message = (formData.get("message") as string).trim()

    if (!email || !message || message.length < 10) return

    submitBtn.disabled = true
    submitBtn.textContent = "Sending..."

    try {
      if (!CONTACT_API_URL) throw new Error("Contact form is not configured")

      const response = await fetch(CONTACT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Feature Request",
          email,
          subject: "Feature Request",
          message,
        }),
      })

      if (!response.ok) throw new Error("Failed to send feature request")

      statusDiv.textContent = "Thank you for your suggestion! We'll review it soon."
      statusDiv.className = "p-3 rounded-md text-sm bg-green-50 text-green-800 border border-green-200"
      form.reset()
    } catch (error) {
      statusDiv.textContent = "Failed to send feature request. Please try again later."
      statusDiv.className = "p-3 rounded-md text-sm bg-red-50 text-red-800 border border-red-200"
      console.error("Feature request error:", error)
    } finally {
      submitBtn.disabled = false
      submitBtn.textContent = "Submit Feature Request"
    }
  })

  return {
    element: fab,
    destroy: () => {
      dialog.remove()
    },
  }
}
