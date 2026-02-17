import type { Component, ActionConfig } from "../types"
import { getVideoData } from "../store"
import { createVideoUploadPrompt } from "../components/video-upload-prompt"
import { createBackButton } from "../components/back-button"
import { createProcessingButton } from "../components/processing-button"
import { createVideoUrl } from "../lib/video-url"
import { createVideoFramerate } from "../lib/video-framerate"
import { snapTimeToFrame, formatTime } from "../lib/time-utils"
import { iconSvg } from "../lib/icons"

/**
 * Frame extract page for extracting frames as images.
 * Includes its own video player with play/pause and seekable timeline.
 * Supports single frame, interval, and all-frames extraction modes.
 */
export default function createFrameExtractPage(): Component {
  const container = document.createElement("div")
  container.className = "container mx-auto px-6 py-12 min-h-screen pt-20"

  let activeChildren: Component[] = []
  let revokeUrl: (() => void) | null = null
  let framerateHandle: { getFramerateFps: () => number; destroy: () => void } | null = null

  if (!getVideoData()) {
    const prompt = createVideoUploadPrompt(() => {
      prompt.element.remove()
      renderPage()
    })
    activeChildren.push(prompt)
    container.appendChild(prompt.element)
  } else {
    renderPage()
  }

  function renderPage(): void {
    const videoData = getVideoData()
    if (!videoData) return
    activeChildren.forEach((c) => c.destroy())
    activeChildren = []
    container.innerHTML = ""

    let isPlaying = false
    let currentTimeSec = 0
    let durationSec = 0
    let extractMode = "interval"
    let intervalValue = "1"
    let format = "png"

    const { url, revoke } = createVideoUrl(videoData.file)
    revokeUrl = revoke

    const inner = document.createElement("div")
    inner.className = "max-w-6xl mx-auto space-y-6"

    const backBtn = createBackButton()
    activeChildren.push(backBtn)
    inner.appendChild(backBtn.element)

    const content = document.createElement("div")
    content.className = "space-y-4"

    // Custom video player
    const videoWrapper = document.createElement("div")
    videoWrapper.className = "relative aspect-video bg-black rounded-lg overflow-hidden"

    const video = document.createElement("video")
    video.src = url
    video.className = "w-full h-full object-contain"
    videoWrapper.appendChild(video)
    content.appendChild(videoWrapper)

    // Framerate detection
    framerateHandle = createVideoFramerate(video)

    // Play/Pause button
    const controlsDiv = document.createElement("div")
    controlsDiv.className = "flex items-center justify-center"

    const playBtn = document.createElement("button")
    playBtn.className = "inline-flex items-center justify-center rounded-full border border-input bg-transparent hover:bg-accent hover:text-accent-foreground w-12 h-12"
    playBtn.innerHTML = iconSvg("Play", 20, "w-5 h-5 ml-0.5")
    controlsDiv.appendChild(playBtn)
    content.appendChild(controlsDiv)

    function updatePlayButton(): void {
      playBtn.innerHTML = isPlaying
        ? iconSvg("Pause", 20, "w-5 h-5")
        : iconSvg("Play", 20, "w-5 h-5 ml-0.5")
    }

    playBtn.addEventListener("click", () => {
      if (isPlaying) {
        video.pause()
      } else {
        video.play()
      }
    })

    video.addEventListener("play", () => {
      isPlaying = true
      updatePlayButton()
    })
    video.addEventListener("pause", () => {
      isPlaying = false
      updatePlayButton()
    })

    // Timeline
    const timelineSection = document.createElement("div")
    timelineSection.className = "space-y-2"

    const timelineBar = document.createElement("div")
    timelineBar.className = "relative h-1.5 bg-secondary rounded-full cursor-pointer group"

    const timelineProgress = document.createElement("div")
    timelineProgress.className = "absolute top-0 left-0 h-full bg-accent rounded-full transition-all"
    timelineProgress.style.width = "0%"
    timelineBar.appendChild(timelineProgress)

    const timelineThumb = document.createElement("div")
    timelineThumb.className = "absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-accent rounded-full shadow-lg transition-all"
    timelineThumb.style.left = "0%"
    timelineThumb.style.marginLeft = "-0.5rem"
    timelineBar.appendChild(timelineThumb)

    timelineBar.addEventListener("click", (e) => {
      if (!durationSec) return
      const rect = timelineBar.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percentage = x / rect.width
      const fps = framerateHandle?.getFramerateFps() ?? 30
      const time = snapTimeToFrame(percentage * durationSec, fps, durationSec)
      video.currentTime = time
      currentTimeSec = time
      updateTimeline()
      updateInfoPanel()
    })

    timelineSection.appendChild(timelineBar)

    const timeLabels = document.createElement("div")
    timeLabels.className = "flex justify-between text-sm text-muted-foreground"
    const currentTimeLabel = document.createElement("span")
    currentTimeLabel.textContent = "0:00"
    const durationLabel = document.createElement("span")
    durationLabel.textContent = "0:00"
    timeLabels.appendChild(currentTimeLabel)
    timeLabels.appendChild(durationLabel)
    timelineSection.appendChild(timeLabels)
    content.appendChild(timelineSection)

    function updateTimeline(): void {
      const pct = durationSec > 0 ? (currentTimeSec / durationSec) * 100 : 0
      timelineProgress.style.width = `${pct}%`
      timelineThumb.style.left = `${pct}%`
      currentTimeLabel.textContent = formatTime(currentTimeSec)
      durationLabel.textContent = formatTime(durationSec)
    }

    video.addEventListener("loadedmetadata", () => {
      durationSec = video.duration
      updateTimeline()
      updateInfoPanel()
    })

    video.addEventListener("timeupdate", () => {
      currentTimeSec = video.currentTime
      updateTimeline()
      updateInfoPanel()
    })

    // Settings panel
    const settingsPanel = document.createElement("div")
    settingsPanel.className = "bg-secondary/50 rounded-lg p-6 space-y-6"

    // Header
    const header = document.createElement("div")
    header.className = "space-y-2"
    header.innerHTML = `
      <h3 class="text-lg font-semibold">Frame Extraction Settings</h3>
      <p class="text-sm text-muted-foreground">Extract frames from your video as images</p>
    `
    settingsPanel.appendChild(header)

    // Controls wrapper
    const controls = document.createElement("div")
    controls.className = "space-y-6"

    // Extraction mode select
    const modeSection = document.createElement("div")
    modeSection.className = "space-y-2"

    const modeLabel = document.createElement("label")
    modeLabel.className = "text-sm font-medium leading-none"
    modeLabel.textContent = "Extraction Mode"
    modeSection.appendChild(modeLabel)

    const modeSelect = document.createElement("select")
    modeSelect.className = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    modeSelect.innerHTML = `
      <option value="single">Single frame (current time)</option>
      <option value="interval" selected>Every N seconds</option>
      <option value="all">All frames</option>
    `
    modeSelect.addEventListener("change", () => {
      extractMode = modeSelect.value
      updateModeSpecificUI()
      updateInfoPanel()
      updateProcessingButton()
    })
    modeSection.appendChild(modeSelect)
    controls.appendChild(modeSection)

    // Mode-specific content container
    const modeSpecificContainer = document.createElement("div")
    controls.appendChild(modeSpecificContainer)

    function updateModeSpecificUI(): void {
      modeSpecificContainer.innerHTML = ""

      if (extractMode === "single") {
        const singleSection = document.createElement("div")
        singleSection.className = "space-y-2"

        const singleLabel = document.createElement("label")
        singleLabel.className = "text-sm font-medium leading-none"
        singleLabel.textContent = "Current Frame"
        singleSection.appendChild(singleLabel)

        const singleDesc = document.createElement("p")
        singleDesc.className = "text-sm text-muted-foreground"
        singleDesc.textContent = "This will extract the frame at the current timestamp."
        singleSection.appendChild(singleDesc)

        modeSpecificContainer.appendChild(singleSection)
      }

      if (extractMode === "interval") {
        const intervalSection = document.createElement("div")
        intervalSection.className = "space-y-2"

        const intervalLabel = document.createElement("label")
        intervalLabel.className = "text-sm font-medium leading-none"
        intervalLabel.textContent = "Interval (seconds)"
        intervalSection.appendChild(intervalLabel)

        const intervalInput = document.createElement("input")
        intervalInput.type = "number"
        intervalInput.value = intervalValue
        intervalInput.placeholder = "1"
        intervalInput.step = "0.1"
        intervalInput.min = "0.1"
        intervalInput.className = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        intervalInput.addEventListener("input", () => {
          intervalValue = intervalInput.value
          updateInfoPanel()
          updateProcessingButton()
        })
        intervalSection.appendChild(intervalInput)

        const intervalHint = document.createElement("p")
        intervalHint.className = "text-xs text-muted-foreground"
        intervalHint.textContent = `Extract one frame every ${intervalValue} seconds`
        intervalSection.appendChild(intervalHint)

        modeSpecificContainer.appendChild(intervalSection)
      }
    }

    // Image format select
    const formatSection = document.createElement("div")
    formatSection.className = "space-y-2"

    const formatLabel = document.createElement("label")
    formatLabel.className = "text-sm font-medium leading-none"
    formatLabel.textContent = "Image Format"
    formatSection.appendChild(formatLabel)

    const formatSelect = document.createElement("select")
    formatSelect.className = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    formatSelect.innerHTML = `
      <option value="png" selected>PNG (lossless)</option>
      <option value="jpg">JPG (smaller file)</option>
      <option value="webp">WebP</option>
    `
    formatSelect.addEventListener("change", () => {
      format = formatSelect.value
      updateProcessingButton()
    })
    formatSection.appendChild(formatSelect)
    controls.appendChild(formatSection)

    settingsPanel.appendChild(controls)

    // Initialize mode-specific UI
    updateModeSpecificUI()

    // Info panel
    const infoPanel = document.createElement("div")
    infoPanel.className = "bg-background/50 rounded p-4 text-sm space-y-1"

    function getEstimatedFrames(): string {
      const fps = framerateHandle?.getFramerateFps() ?? 30
      if (extractMode === "interval") {
        const parsedInterval = Number.parseFloat(intervalValue || "1")
        return String(Math.floor(durationSec / parsedInterval))
      }
      if (extractMode === "single") {
        return "1"
      }
      if (extractMode === "all") {
        return String(Math.floor(durationSec * fps))
      }
      return "\u2014"
    }

    function updateInfoPanel(): void {
      infoPanel.innerHTML = `
        <p class="text-muted-foreground">Current timestamp: ${formatTime(currentTimeSec)}</p>
        <p class="text-muted-foreground">Estimated frames: ${getEstimatedFrames()}</p>
      `
    }
    updateInfoPanel()
    settingsPanel.appendChild(infoPanel)

    // Processing button
    const processingBtnContainer = document.createElement("div")
    settingsPanel.appendChild(processingBtnContainer)

    let processingBtn: Component | null = null

    function getActionConfig(): ActionConfig {
      const fps = framerateHandle?.getFramerateFps() ?? 30
      return {
        type: "frame-extract",
        params: {
          mode: extractMode,
          interval: extractMode === "interval" ? intervalValue : undefined,
          timestamp: extractMode === "single" ? snapTimeToFrame(currentTimeSec, fps, durationSec).toFixed(3) : undefined,
          format,
        },
      }
    }

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
      framerateHandle?.destroy()
      revokeUrl?.()
    },
  }
}
