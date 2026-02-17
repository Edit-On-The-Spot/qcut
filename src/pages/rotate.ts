import type { Component, ActionConfig } from "../types"
import { getState, subscribe } from "../store"
import { waitForVideo } from "../lib/require-video"
import { createVideoLoading } from "../components/video-loading"
import { createVideoUploadPrompt } from "../components/video-upload-prompt"
import { createBackButton } from "../components/back-button"
import { createProcessingButton } from "../components/processing-button"
import { createVideoPreview } from "../components/video-preview"
import { createVideoUrl } from "../lib/video-url"
import { iconSvg } from "../lib/icons"

/** File extensions that support lossless rotation via metadata. */
const LOSSLESS_ROTATION_EXTENSIONS = ["mp4", "mov", "m4v"]

/**
 * Checks if a filename has an extension that supports lossless rotation.
 * MP4/MOV containers can store rotation as metadata without re-encoding.
 */
function isLosslessRotationSupported(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() || ""
  return LOSSLESS_ROTATION_EXTENSIONS.includes(ext)
}

/**
 * Rotate page for rotating and flipping video.
 * Supports 0/90/180/270 degree rotations and horizontal/vertical flips.
 * Uses lossless metadata rotation for MP4/MOV when only rotating (no flips).
 */
export default function createRotatePage(): Component {
  const container = document.createElement("div")
  container.className = "container mx-auto px-6 py-12 min-h-screen pt-20"

  const loading = createVideoLoading("Loading video data...")
  container.appendChild(loading.element)

  let activeChildren: Component[] = []
  let unsub: (() => void) | null = null
  let videoUrl: { url: string; revoke: () => void } | null = null

  waitForVideo().then(({ needsUpload }) => {
    loading.element.remove()

    if (needsUpload) {
      const prompt = createVideoUploadPrompt()
      activeChildren.push(prompt)
      container.appendChild(prompt.element)
      unsub = subscribe(() => {
        if (getState().videoData) {
          unsub?.()
          unsub = null
          prompt.element.remove()
          renderPage()
        }
      })
      return
    }
    renderPage()
  })

  function renderPage(): void {
    const videoData = getState().videoData
    if (!videoData) return

    activeChildren.forEach((c) => c.destroy())
    activeChildren = []
    container.innerHTML = ""

    videoUrl = createVideoUrl(videoData.file)

    let rotation = 0
    let isFlipHorizontal = false
    let isFlipVertical = false

    const isLosslessFormat = isLosslessRotationSupported(videoData.file.name)

    const inner = document.createElement("div")
    inner.className = "max-w-6xl mx-auto space-y-6"

    // Back button
    const backBtn = createBackButton()
    activeChildren.push(backBtn)
    inner.appendChild(backBtn.element)

    // Content wrapper
    const contentDiv = document.createElement("div")
    contentDiv.className = "space-y-4"

    // Video preview
    const preview = createVideoPreview({ src: videoUrl.url })
    activeChildren.push(preview)
    preview.video.className = "w-full h-full object-contain transition-transform duration-300"
    contentDiv.appendChild(preview.element)

    /** Applies the current rotation/flip as a CSS transform on the video element. */
    function updatePreviewTransform(): void {
      const transforms: string[] = []
      // For 90/270 rotation, scale down to prevent cropping since dimensions swap
      if (rotation === 90 || rotation === 270) {
        const w = videoData!.width || 16
        const h = videoData!.height || 9
        const scale = Math.min(w / h, h / w)
        transforms.push(`scale(${scale})`)
      }
      if (rotation !== 0) {
        transforms.push(`rotate(${rotation}deg)`)
      }
      if (isFlipHorizontal) {
        transforms.push("scaleX(-1)")
      }
      if (isFlipVertical) {
        transforms.push("scaleY(-1)")
      }
      preview.video.style.transform = transforms.join(" ")
    }

    // Settings panel
    const settingsPanel = document.createElement("div")
    settingsPanel.className = "bg-secondary/50 rounded-lg p-6 space-y-6"

    // Header
    const headerDiv = document.createElement("div")
    headerDiv.className = "space-y-2"
    headerDiv.innerHTML = `
      <h3 class="text-lg font-semibold">Rotate & Flip</h3>
      <p class="text-sm text-muted-foreground">Rotate or flip your video</p>
    `
    settingsPanel.appendChild(headerDiv)

    // Controls container
    const controlsDiv = document.createElement("div")
    controlsDiv.className = "space-y-6"

    // Rotation buttons
    const rotationSection = document.createElement("div")
    rotationSection.className = "space-y-3"

    const rotationLabel = document.createElement("label")
    rotationLabel.className = "text-sm font-medium leading-none"
    rotationLabel.textContent = "Rotation"
    rotationSection.appendChild(rotationLabel)

    const rotationButtonsDiv = document.createElement("div")
    rotationButtonsDiv.className = "flex gap-2"

    const rotationButtons: HTMLButtonElement[] = []
    const degrees = [0, 90, 180, 270]

    for (const deg of degrees) {
      const btn = document.createElement("button")
      rotationButtons.push(btn)

      btn.addEventListener("click", () => {
        rotation = deg
        updateRotationButtons()
        updatePreviewTransform()
        updateInfoSection()
        updateProcessingButton()
      })

      rotationButtonsDiv.appendChild(btn)
    }

    function updateRotationButtons(): void {
      const activeClass = "inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 bg-accent text-accent-foreground"
      const inactiveClass = "inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 border border-input bg-transparent hover:bg-accent hover:text-accent-foreground"

      degrees.forEach((deg, i) => {
        rotationButtons[i].className = rotation === deg ? activeClass : inactiveClass
        rotationButtons[i].innerHTML = `${iconSvg("RotateCw", 16, `w-4 h-4 mr-2`)} ${deg}\u00B0`
        // Apply rotation to the icon itself
        const svgEl = rotationButtons[i].querySelector("svg")
        if (svgEl) svgEl.style.transform = `rotate(${deg}deg)`
      })
    }

    updateRotationButtons()
    rotationSection.appendChild(rotationButtonsDiv)
    controlsDiv.appendChild(rotationSection)

    // Flip buttons
    const flipSection = document.createElement("div")
    flipSection.className = "space-y-3"

    const flipLabel = document.createElement("label")
    flipLabel.className = "text-sm font-medium leading-none"
    flipLabel.textContent = "Flip"
    flipSection.appendChild(flipLabel)

    const flipButtonsDiv = document.createElement("div")
    flipButtonsDiv.className = "flex gap-2"

    const flipHBtn = document.createElement("button")
    const flipVBtn = document.createElement("button")

    function updateFlipButtons(): void {
      const activeClass = "inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 bg-accent text-accent-foreground"
      const inactiveClass = "inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 border border-input bg-transparent hover:bg-accent hover:text-accent-foreground"

      flipHBtn.className = isFlipHorizontal ? activeClass : inactiveClass
      flipHBtn.innerHTML = `${iconSvg("FlipHorizontal", 16, "w-4 h-4 mr-2")} Horizontal`

      flipVBtn.className = isFlipVertical ? activeClass : inactiveClass
      flipVBtn.innerHTML = `${iconSvg("FlipVertical", 16, "w-4 h-4 mr-2")} Vertical`
    }

    updateFlipButtons()

    flipHBtn.addEventListener("click", () => {
      isFlipHorizontal = !isFlipHorizontal
      updateFlipButtons()
      updatePreviewTransform()
      updateInfoSection()
      updateProcessingButton()
    })

    flipVBtn.addEventListener("click", () => {
      isFlipVertical = !isFlipVertical
      updateFlipButtons()
      updatePreviewTransform()
      updateInfoSection()
      updateProcessingButton()
    })

    flipButtonsDiv.appendChild(flipHBtn)
    flipButtonsDiv.appendChild(flipVBtn)
    flipSection.appendChild(flipButtonsDiv)
    controlsDiv.appendChild(flipSection)

    settingsPanel.appendChild(controlsDiv)

    // Info section
    const infoDiv = document.createElement("div")
    infoDiv.className = "bg-background/50 rounded p-4 text-sm space-y-1"

    function updateInfoSection(): void {
      const hasTransformation = rotation !== 0 || isFlipHorizontal || isFlipVertical
      const hasFlip = isFlipHorizontal || isFlipVertical
      const willUseLossless = isLosslessFormat && !hasFlip && rotation !== 0

      let statusText = `Current: ${rotation}\u00B0 rotation`
      if (isFlipHorizontal) statusText += ", flipped horizontally"
      if (isFlipVertical) statusText += ", flipped vertically"
      if (!hasTransformation) statusText += " (no changes)"

      let modeHtml = ""
      if (hasTransformation) {
        if (willUseLossless) {
          modeHtml = `<p class="text-green-500">Lossless mode: rotation via metadata (no re-encoding)</p>`
        } else if (hasFlip && isLosslessFormat) {
          modeHtml = `<p class="text-muted-foreground">Re-encoding required: flips cannot be done losslessly</p>`
        } else if (!isLosslessFormat) {
          modeHtml = `<p class="text-muted-foreground">Re-encoding required: format does not support lossless rotation</p>`
        }
      }

      infoDiv.innerHTML = `
        <p class="text-muted-foreground">${statusText}</p>
        ${modeHtml}
      `
    }

    updateInfoSection()
    settingsPanel.appendChild(infoDiv)

    // Processing button
    const getActionConfig = (): ActionConfig => ({
      type: "rotate",
      params: {
        rotation,
        isFlipHorizontal,
        isFlipVertical,
        isLosslessFormat,
      },
    })

    let processingBtn: Component | null = null
    const processingBtnContainer = document.createElement("div")

    function updateProcessingButton(): void {
      if (processingBtn) {
        processingBtn.destroy()
        const idx = activeChildren.indexOf(processingBtn)
        if (idx !== -1) activeChildren.splice(idx, 1)
      }
      processingBtnContainer.innerHTML = ""
      processingBtn = createProcessingButton({ config: getActionConfig() })
      activeChildren.push(processingBtn)
      processingBtnContainer.appendChild(processingBtn.element)
    }
    updateProcessingButton()
    settingsPanel.appendChild(processingBtnContainer)

    contentDiv.appendChild(settingsPanel)
    inner.appendChild(contentDiv)
    container.appendChild(inner)
  }

  return {
    element: container,
    destroy: () => {
      activeChildren.forEach((c) => c.destroy())
      unsub?.()
      videoUrl?.revoke()
    },
  }
}
