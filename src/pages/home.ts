import type { Component, ActionType } from "../types"
import { setVideoData, getVideoData } from "../store"
import { navigate, actionTypePath } from "../router"
import { createLogger } from "../lib/logger"
import { trackVideoImport, trackVideoImportError, trackFeatureClick } from "../lib/analytics"
import { getFileSizeWarningType } from "../lib/file-utils"
import { createHero } from "../components/landing/hero"
import { createDropzone } from "../components/landing/dropzone"
import { createWhyQcut } from "../components/landing/why-qcut"
import { createFeatures } from "../components/landing/features"
import { createHowItWorks } from "../components/landing/how-it-works"
import { createFAQ } from "../components/landing/faq"
import { createFinalCTA } from "../components/landing/final-cta"
import { createFooter } from "../components/landing/footer"
import { createFileSelectModal } from "../components/file-select-modal"
import { createFileSizeWarning } from "../components/file-size-warning"

const log = createLogger("home")

/**
 * Home page orchestrator (replaces import-screen.tsx).
 * Renders hero, dropzone, features, FAQ, footer, and handles file upload flow.
 */
export default function createHomePage(): Component {
  const container = document.createElement("div")
  container.className = "min-h-screen w-full bg-background"

  // Hidden file input for hero/CTA buttons
  const fileInput = document.createElement("input")
  fileInput.type = "file"
  fileInput.accept = "video/*"
  fileInput.setAttribute("aria-label", "Select video file")
  fileInput.className = "sr-only"
  container.appendChild(fileInput)

  // Track pending action from feature card clicks
  let pendingAction: ActionType | null = null
  let activeModal: Component | null = null

  const selectVideo = () => fileInput.click()

  /**
   * Validates file size and either shows a warning or proceeds with processing.
   */
  function handleFileSelect(file: File): void {
    const warningType = getFileSizeWarningType(file.size)
    if (warningType) {
      const warning = createFileSizeWarning(
        warningType,
        file.size,
        () => {},
        () => processFile(file)
      )
      document.body.appendChild(warning.element)
      ;(warning.element as HTMLDialogElement).showModal()
    } else {
      processFile(file)
    }
  }

  /**
   * Extracts video metadata and navigates to actions/operation page.
   */
  function processFile(file: File): void {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2)
    log.info("Processing file: %s (%sMB)", file.name, sizeInMB)

    const video = document.createElement("video")
    video.preload = "metadata"
    const objectUrl = URL.createObjectURL(file)

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl)
      log.debug("Metadata loaded: duration=%d, dimensions=%dx%d", video.duration, video.videoWidth, video.videoHeight)

      const fileSizeMB = file.size / (1024 * 1024)
      trackVideoImport(file.name, fileSizeMB)

      setVideoData({
        file,
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        format: file.name.split(".").pop()?.toUpperCase(),
      })

      // Navigate immediately — store updates synchronously
      const action = pendingAction
      const destination = action ? (actionTypePath[action] ?? `/${action}`) : "/actions"
      log.debug("Navigating to: %s (pendingAction: %s)", destination, action)
      navigate(destination)
      pendingAction = null

      // Load file data in background
      file
        .arrayBuffer()
        .then((buffer) => {
          const current = getVideoData()
          if (current?.file === file) {
            setVideoData({ ...current, fileData: new Uint8Array(buffer) })
          }
        })
        .catch(() => {})
    }

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      log.error("Failed to load video metadata for: %s", file.name)
      const errorMsg = "Unable to load video. The file may be corrupted or in an unsupported format."
      trackVideoImportError(errorMsg)
      showErrorToast(errorMsg)
    }

    video.src = objectUrl
  }

  /** Shows a temporary error toast. */
  function showErrorToast(message: string): void {
    const toast = document.createElement("div")
    toast.className = "fixed bottom-4 right-4 z-50 bg-destructive text-destructive-foreground px-4 py-3 rounded-md shadow-lg flex items-center gap-3"
    toast.innerHTML = `
      <span>${message}</span>
      <button class="text-destructive-foreground/70 hover:text-destructive-foreground">&times;</button>
    `
    toast.querySelector("button")!.addEventListener("click", () => toast.remove())
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 8000)
  }

  /** Handles feature card click — opens file select modal. */
  function handleFeatureClick(actionType: ActionType): void {
    pendingAction = actionType
    trackFeatureClick(actionType)

    activeModal?.destroy()
    activeModal = createFileSelectModal(
      `Select video to ${actionType.replace("-", " ")}`,
      (file) => {
        activeModal = null
        processFile(file)
      },
      () => {
        pendingAction = null
        activeModal = null
      }
    )
  }

  fileInput.addEventListener("change", () => {
    if (fileInput.files && fileInput.files.length > 0) {
      handleFileSelect(fileInput.files[0])
    }
  })

  // Build the page
  const main = document.createElement("main")
  const children: Component[] = []

  const hero = createHero(selectVideo)
  children.push(hero)
  main.appendChild(hero.element)

  const dropzone = createDropzone(handleFileSelect)
  children.push(dropzone)
  main.appendChild(dropzone.element)

  const whyQcut = createWhyQcut()
  children.push(whyQcut)
  main.appendChild(whyQcut.element)

  const features = createFeatures(handleFeatureClick)
  children.push(features)
  main.appendChild(features.element)

  const howItWorks = createHowItWorks()
  children.push(howItWorks)
  main.appendChild(howItWorks.element)

  const faq = createFAQ()
  children.push(faq)
  main.appendChild(faq.element)

  const finalCta = createFinalCTA(selectVideo)
  children.push(finalCta)
  main.appendChild(finalCta.element)

  container.appendChild(main)

  const footer = createFooter()
  children.push(footer)
  container.appendChild(footer.element)

  return {
    element: container,
    destroy: () => {
      children.forEach((c) => c.destroy())
      activeModal?.destroy()
    },
  }
}
