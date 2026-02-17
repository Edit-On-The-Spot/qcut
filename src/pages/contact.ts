import type { Component } from "../types"
import { iconSvg } from "../lib/icons"

/**
 * Contact page with form for sending messages to support.
 * Uses native HTML validation instead of react-hook-form + zod.
 * Submits to the same Lambda API endpoint via VITE_CONTACT_API_URL.
 */
export default function createContactPage(): Component {
  const container = document.createElement("div")
  container.className = "container mx-auto px-4 py-16 min-h-screen pt-20"

  container.innerHTML = `
    <div class="max-w-4xl mx-auto">
      <div class="text-center mb-12">
        <h1 class="text-4xl font-bold mb-4">Contact Us</h1>
        <p class="text-lg text-muted-foreground">
          We'd love to hear from you. Whether you have a question, feedback, or need support,
          our team is here to help.
        </p>
      </div>

      <div class="w-full max-w-2xl mx-auto rounded-xl border bg-card text-card-foreground shadow-sm">
        <div class="p-6 pb-2">
          <h2 class="text-2xl font-semibold leading-none tracking-tight">Get in Touch</h2>
          <p class="text-sm text-muted-foreground mt-1.5">
            Have a question or feedback? Send us a message and we'll respond as soon as possible.
          </p>
        </div>
        <div class="p-6 pt-4">
          <form id="contact-form" class="space-y-6" novalidate>
            <div class="space-y-2">
              <label for="contact-name" class="text-sm font-medium leading-none">Name</label>
              <input id="contact-name" name="name" type="text" placeholder="Your name" required minlength="2" maxlength="100"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
              <p class="text-sm text-red-500 hidden" data-error="name"></p>
            </div>

            <div class="space-y-2">
              <label for="contact-email" class="text-sm font-medium leading-none">Email</label>
              <input id="contact-email" name="email" type="email" placeholder="your.email@example.com" required maxlength="254"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
              <p class="text-sm text-red-500 hidden" data-error="email"></p>
            </div>

            <div class="space-y-2">
              <label for="contact-subject" class="text-sm font-medium leading-none">Subject</label>
              <input id="contact-subject" name="subject" type="text" placeholder="What's this about?" required minlength="3" maxlength="200"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
              <p class="text-sm text-red-500 hidden" data-error="subject"></p>
            </div>

            <div class="space-y-2">
              <label for="contact-message" class="text-sm font-medium leading-none">Message</label>
              <textarea id="contact-message" name="message" placeholder="Your message..." required minlength="10" maxlength="5000"
                class="w-full min-h-[150px] px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"></textarea>
              <p class="text-sm text-red-500 hidden" data-error="message"></p>
            </div>

            <div id="contact-status" class="hidden"></div>

            <button type="submit" id="contact-submit"
              class="inline-flex items-center justify-center rounded-md text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/90 h-10 px-4 py-2 w-full">
              ${iconSvg("Send", 16, "w-4 h-4 mr-2")} Send Message
            </button>
          </form>
        </div>
      </div>
    </div>
  `

  const form = container.querySelector("#contact-form") as HTMLFormElement
  const submitBtn = container.querySelector("#contact-submit") as HTMLButtonElement
  const statusDiv = container.querySelector("#contact-status") as HTMLDivElement

  /** Validates a single field, showing/hiding its error message. */
  function validateField(input: HTMLInputElement | HTMLTextAreaElement): boolean {
    const errorEl = container.querySelector(`[data-error="${input.name}"]`) as HTMLElement
    if (!errorEl) return input.checkValidity()

    if (input.validity.valid) {
      errorEl.classList.add("hidden")
      errorEl.textContent = ""
      return true
    }

    let message = input.validationMessage
    if (input.validity.tooShort) {
      message = `Must be at least ${input.minLength} characters`
    } else if (input.validity.tooLong) {
      message = `Must be ${input.maxLength} characters or less`
    } else if (input.validity.valueMissing) {
      message = "This field is required"
    } else if (input.validity.typeMismatch && input.type === "email") {
      message = "Please enter a valid email address"
    }

    errorEl.textContent = message
    errorEl.classList.remove("hidden")
    return false
  }

  // Live validation on blur
  const inputs = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea")
  inputs.forEach((input) => {
    input.addEventListener("blur", () => validateField(input))
    input.addEventListener("input", () => {
      const errorEl = container.querySelector(`[data-error="${input.name}"]`) as HTMLElement
      if (errorEl && !errorEl.classList.contains("hidden")) {
        validateField(input)
      }
    })
  })

  form.addEventListener("submit", async (e) => {
    e.preventDefault()

    // Validate all fields
    let isValid = true
    inputs.forEach((input) => {
      if (!validateField(input)) isValid = false
    })
    if (!isValid) return

    // Disable form
    submitBtn.disabled = true
    submitBtn.innerHTML = `${iconSvg("Loader2", 16, "w-4 h-4 mr-2 animate-spin")} Sending...`
    statusDiv.classList.add("hidden")
    inputs.forEach((input) => { input.disabled = true })

    try {
      const apiUrl = import.meta.env.VITE_CONTACT_API_URL
      if (!apiUrl) {
        throw new Error("Contact form is not configured")
      }

      const formData = new FormData(form)
      const data = {
        name: formData.get("name"),
        email: formData.get("email"),
        subject: formData.get("subject"),
        message: formData.get("message"),
      }

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error("Failed to send message")
      }

      statusDiv.className = "p-4 rounded-md bg-green-50 text-green-800 border border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-800"
      statusDiv.textContent = "Thank you for your message! We'll get back to you soon."
      statusDiv.classList.remove("hidden")
      form.reset()
    } catch (error) {
      statusDiv.className = "p-4 rounded-md bg-red-50 text-red-800 border border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-800"
      statusDiv.textContent = "Failed to send message. Please try again later."
      statusDiv.classList.remove("hidden")
      console.error("Contact form error:", error)
    } finally {
      submitBtn.disabled = false
      submitBtn.innerHTML = `${iconSvg("Send", 16, "w-4 h-4 mr-2")} Send Message`
      inputs.forEach((input) => { input.disabled = false })
    }
  })

  return { element: container, destroy: () => {} }
}
