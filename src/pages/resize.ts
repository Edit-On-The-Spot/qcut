import type { Component, ActionConfig } from "../types"
import { getState, subscribe } from "../store"
import { waitForVideo } from "../lib/require-video"
import { createVideoLoading } from "../components/video-loading"
import { createVideoUploadPrompt } from "../components/video-upload-prompt"
import { createBackButton } from "../components/back-button"
import { createProcessingButton } from "../components/processing-button"
import { createVideoPreview } from "../components/video-preview"
import { createVideoUrl } from "../lib/video-url"

/**
 * Resize page for changing video dimensions.
 * Allows selecting preset resolutions or custom dimensions.
 */
export default function createResizePage(): Component {
  const container = document.createElement("div")
  container.className = "container mx-auto px-6 py-12 min-h-screen pt-20"

  const loading = createVideoLoading("Loading video data...")
  container.appendChild(loading.element)

  let activeChildren: Component[] = []
  let unsub: (() => void) | null = null
  let revokeUrl: (() => void) | null = null

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

    const currentWidth = videoData.width
    const currentHeight = videoData.height

    let preset = "custom"
    let width = currentWidth?.toString() || "1920"
    let height = currentHeight?.toString() || "1080"

    const { url, revoke } = createVideoUrl(videoData.file)
    revokeUrl = revoke

    const inner = document.createElement("div")
    inner.className = "max-w-6xl mx-auto space-y-6"

    const backBtn = createBackButton()
    activeChildren.push(backBtn)
    inner.appendChild(backBtn.element)

    const content = document.createElement("div")
    content.className = "space-y-4"

    const preview = createVideoPreview({ src: url })
    activeChildren.push(preview)
    content.appendChild(preview.element)

    const settingsPanel = document.createElement("div")
    settingsPanel.className = "bg-secondary/50 rounded-lg p-6 space-y-6"

    function getActionConfig(): ActionConfig {
      return {
        type: "resize",
        params: { width, height },
      }
    }

    // Header
    const header = document.createElement("div")
    header.className = "space-y-2"
    header.innerHTML = `
      <h3 class="text-lg font-semibold">Resize Settings</h3>
      <p class="text-sm text-muted-foreground">Change the dimensions of your video</p>
    `
    settingsPanel.appendChild(header)

    // Controls wrapper
    const controls = document.createElement("div")
    controls.className = "space-y-6"

    // Preset select
    const presetSection = document.createElement("div")
    presetSection.className = "space-y-2"

    const presetLabel = document.createElement("label")
    presetLabel.className = "text-sm font-medium leading-none"
    presetLabel.textContent = "Preset Resolutions"
    presetSection.appendChild(presetLabel)

    const presetSelect = document.createElement("select")
    presetSelect.className = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    presetSelect.innerHTML = `
      <option value="1080p">1080p (1920x1080)</option>
      <option value="720p">720p (1280x720)</option>
      <option value="480p">480p (854x480)</option>
      <option value="360p">360p (640x360)</option>
      <option value="custom" selected>Custom</option>
    `
    presetSelect.addEventListener("change", () => {
      preset = presetSelect.value
      const presetMap: Record<string, [string, string]> = {
        "1080p": ["1920", "1080"],
        "720p": ["1280", "720"],
        "480p": ["854", "480"],
        "360p": ["640", "360"],
      }
      if (presetMap[preset]) {
        const [w, h] = presetMap[preset]
        width = w
        height = h
        widthInput.value = w
        heightInput.value = h
        updateInfo()
        updateProcessingButton()
      }
    })
    presetSection.appendChild(presetSelect)
    controls.appendChild(presetSection)

    // Width and Height inputs
    const dimensionsGrid = document.createElement("div")
    dimensionsGrid.className = "grid md:grid-cols-2 gap-6"

    // Width input
    const widthSection = document.createElement("div")
    widthSection.className = "space-y-2"

    const widthLabel = document.createElement("label")
    widthLabel.className = "text-sm font-medium leading-none"
    widthLabel.textContent = "Width (pixels)"
    widthSection.appendChild(widthLabel)

    const widthInput = document.createElement("input")
    widthInput.type = "number"
    widthInput.value = width
    widthInput.placeholder = "1920"
    widthInput.className = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    widthInput.addEventListener("input", () => {
      width = widthInput.value
      preset = "custom"
      presetSelect.value = "custom"
      updateInfo()
      updateProcessingButton()
    })
    widthSection.appendChild(widthInput)
    dimensionsGrid.appendChild(widthSection)

    // Height input
    const heightSection = document.createElement("div")
    heightSection.className = "space-y-2"

    const heightLabel = document.createElement("label")
    heightLabel.className = "text-sm font-medium leading-none"
    heightLabel.textContent = "Height (pixels)"
    heightSection.appendChild(heightLabel)

    const heightInput = document.createElement("input")
    heightInput.type = "number"
    heightInput.value = height
    heightInput.placeholder = "1080"
    heightInput.className = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    heightInput.addEventListener("input", () => {
      height = heightInput.value
      preset = "custom"
      presetSelect.value = "custom"
      updateInfo()
      updateProcessingButton()
    })
    heightSection.appendChild(heightInput)
    dimensionsGrid.appendChild(heightSection)

    controls.appendChild(dimensionsGrid)
    settingsPanel.appendChild(controls)

    // Info panel
    const info = document.createElement("div")
    info.className = "bg-background/50 rounded p-4 text-sm space-y-1"

    function updateInfo(): void {
      info.innerHTML = `
        <p class="text-muted-foreground">Current: ${currentWidth || "\u2014"} \u00d7 ${currentHeight || "\u2014"}</p>
        <p class="text-muted-foreground">New: ${width} \u00d7 ${height}</p>
        <p class="text-muted-foreground">Re-encoding required: resizing changes video frames.</p>
      `
    }
    updateInfo()
    settingsPanel.appendChild(info)

    // Processing button
    const processingBtnContainer = document.createElement("div")
    settingsPanel.appendChild(processingBtnContainer)

    let processingBtn: Component | null = null

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

    content.appendChild(settingsPanel)
    inner.appendChild(content)
    container.appendChild(inner)
  }

  return {
    element: container,
    destroy: () => {
      activeChildren.forEach((c) => c.destroy())
      revokeUrl?.()
      unsub?.()
    },
  }
}
