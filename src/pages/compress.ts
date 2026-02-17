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
 * Compress page for reducing video file size.
 * Allows adjusting quality (CRF) and encoding preset.
 */
export default function createCompressPage(): Component {
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

    let quality = 28
    let preset = "medium"

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

    const fileSizeMB = videoData.file.size / (1024 * 1024)

    function getEstimatedSize(): string {
      return (fileSizeMB * quality / 51).toFixed(2)
    }

    function getActionConfig(): ActionConfig {
      return {
        type: "compress",
        params: { crf: quality, preset },
      }
    }

    // Header
    const header = document.createElement("div")
    header.className = "space-y-2"
    header.innerHTML = `
      <h3 class="text-lg font-semibold">Compression Settings</h3>
      <p class="text-sm text-muted-foreground">Adjust quality and speed settings to compress your video</p>
    `
    settingsPanel.appendChild(header)

    // Controls wrapper
    const controls = document.createElement("div")
    controls.className = "space-y-6"

    // Quality (CRF) slider
    const qualitySection = document.createElement("div")
    qualitySection.className = "space-y-4"

    const qualityHeader = document.createElement("div")
    qualityHeader.className = "flex items-center justify-between"

    const qualityLabel = document.createElement("label")
    qualityLabel.className = "text-sm font-medium leading-none"
    qualityLabel.textContent = "Quality (CRF)"

    const qualityValue = document.createElement("span")
    qualityValue.className = "text-sm text-muted-foreground"
    qualityValue.textContent = String(quality)

    qualityHeader.appendChild(qualityLabel)
    qualityHeader.appendChild(qualityValue)
    qualitySection.appendChild(qualityHeader)

    const slider = document.createElement("input")
    slider.type = "range"
    slider.min = "0"
    slider.max = "51"
    slider.step = "1"
    slider.value = String(quality)
    slider.className = "w-full accent-[hsl(var(--accent))]"
    slider.addEventListener("input", () => {
      quality = Number(slider.value)
      qualityValue.textContent = String(quality)
      updateInfo()
      updateProcessingButton()
    })
    qualitySection.appendChild(slider)

    const qualityHint = document.createElement("p")
    qualityHint.className = "text-xs text-muted-foreground"
    qualityHint.textContent = "Lower = better quality, larger file (18-28 recommended)"
    qualitySection.appendChild(qualityHint)

    controls.appendChild(qualitySection)

    // Encoding preset select
    const presetSection = document.createElement("div")
    presetSection.className = "space-y-2"

    const presetLabel = document.createElement("label")
    presetLabel.className = "text-sm font-medium leading-none"
    presetLabel.textContent = "Encoding Preset"
    presetSection.appendChild(presetLabel)

    const presetSelect = document.createElement("select")
    presetSelect.className = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    presetSelect.innerHTML = `
      <option value="ultrafast">Ultra Fast (largest file)</option>
      <option value="fast">Fast</option>
      <option value="medium" selected>Medium (balanced)</option>
      <option value="slow">Slow</option>
      <option value="veryslow">Very Slow (smallest file)</option>
    `
    presetSelect.addEventListener("change", () => {
      preset = presetSelect.value
      updateProcessingButton()
    })
    presetSection.appendChild(presetSelect)

    const presetHint = document.createElement("p")
    presetHint.className = "text-xs text-muted-foreground"
    presetHint.textContent = "Slower presets = better compression, longer processing"
    presetSection.appendChild(presetHint)

    controls.appendChild(presetSection)
    settingsPanel.appendChild(controls)

    // Info panel
    const info = document.createElement("div")
    info.className = "bg-background/50 rounded p-4 text-sm space-y-1"

    function updateInfo(): void {
      info.innerHTML = `
        <p class="text-muted-foreground">Original size: ${fileSizeMB.toFixed(2)} MB</p>
        <p class="text-muted-foreground">Estimated size: ~${getEstimatedSize()} MB</p>
        <p class="text-muted-foreground">Re-encoding required: compression changes video bitrate.</p>
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
