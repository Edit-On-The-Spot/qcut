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
 * Normalize audio page for adjusting audio levels using the EBU R128 loudnorm filter.
 * Allows setting target loudness (LUFS), true peak (dB), and loudness range (LU).
 */
export default function createNormalizeAudioPage(): Component {
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

    let targetLoudnessLufs = -16
    let truePeakDb = -1.5
    let loudnessRangeLu = 11

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
    contentDiv.appendChild(preview.element)

    // Settings panel
    const settingsPanel = document.createElement("div")
    settingsPanel.className = "bg-secondary/50 rounded-lg p-6 space-y-6"

    // Header
    settingsPanel.innerHTML = `
      <div class="space-y-2">
        <h3 class="text-lg font-semibold">Normalize Audio</h3>
        <p class="text-sm text-muted-foreground">
          Adjust audio levels for consistent loudness using the EBU R128 loudnorm filter
        </p>
      </div>
    `

    // Sliders container
    const slidersDiv = document.createElement("div")
    slidersDiv.className = "space-y-6"

    // Target Loudness slider
    slidersDiv.appendChild(
      createRangeControl({
        label: "Target Loudness (LUFS)",
        value: targetLoudnessLufs,
        min: -24,
        max: -5,
        step: 1,
        unit: " LUFS",
        description: "-16 LUFS is standard for streaming platforms. Lower values = quieter output.",
        onChange: (val) => {
          targetLoudnessLufs = val
        },
      })
    )

    // True Peak slider
    slidersDiv.appendChild(
      createRangeControl({
        label: "True Peak (dB)",
        value: truePeakDb,
        min: -3,
        max: 0,
        step: 0.5,
        unit: " dB",
        description: "Maximum peak level. -1.5 dB provides headroom to prevent clipping.",
        onChange: (val) => {
          truePeakDb = val
        },
      })
    )

    // Loudness Range slider
    slidersDiv.appendChild(
      createRangeControl({
        label: "Loudness Range (LU)",
        value: loudnessRangeLu,
        min: 1,
        max: 20,
        step: 1,
        unit: " LU",
        description: "Dynamic range of loudness. Lower values = more consistent volume.",
        onChange: (val) => {
          loudnessRangeLu = val
        },
      })
    )

    settingsPanel.appendChild(slidersDiv)

    // Info section
    const infoDiv = document.createElement("div")
    infoDiv.className = "bg-background/50 rounded p-4 text-sm"
    infoDiv.innerHTML = `
      <p class="text-muted-foreground">
        Audio normalization adjusts the overall loudness without changing the dynamic range significantly.
        This is useful for making audio consistent across different sources.
      </p>
      <p class="text-muted-foreground mt-2">Re-encoding required: audio filters must be re-encoded.</p>
    `
    settingsPanel.appendChild(infoDiv)

    // Processing button
    const getActionConfig = (): ActionConfig => ({
      type: "normalize-audio",
      params: {
        targetLoudnessLufs,
        truePeakDb,
        loudnessRangeLu,
      },
    })

    const processBtn = createProcessingButton({ config: getActionConfig() })
    activeChildren.push(processBtn)
    settingsPanel.appendChild(processBtn.element)

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

/** Creates a range input control with label, value display, and description. */
function createRangeControl(opts: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  description: string
  onChange: (value: number) => void
}): HTMLElement {
  const wrapper = document.createElement("div")
  wrapper.className = "space-y-3"

  const headerDiv = document.createElement("div")
  headerDiv.className = "flex justify-between"

  const label = document.createElement("label")
  label.className = "text-sm font-medium leading-none"
  label.textContent = opts.label

  const valueSpan = document.createElement("span")
  valueSpan.className = "text-sm text-muted-foreground"
  valueSpan.textContent = `${opts.value}${opts.unit}`

  headerDiv.appendChild(label)
  headerDiv.appendChild(valueSpan)

  const rangeInput = document.createElement("input")
  rangeInput.type = "range"
  rangeInput.min = String(opts.min)
  rangeInput.max = String(opts.max)
  rangeInput.step = String(opts.step)
  rangeInput.value = String(opts.value)
  rangeInput.className = "w-full accent-accent"

  rangeInput.addEventListener("input", () => {
    const val = Number(rangeInput.value)
    valueSpan.textContent = `${val}${opts.unit}`
    opts.onChange(val)
  })

  const desc = document.createElement("p")
  desc.className = "text-xs text-muted-foreground"
  desc.textContent = opts.description

  wrapper.appendChild(headerDiv)
  wrapper.appendChild(rangeInput)
  wrapper.appendChild(desc)

  return wrapper
}
