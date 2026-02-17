import type { Component, ActionConfig } from "../types"
import { getState, subscribe } from "../store"
import { waitForVideo } from "../lib/require-video"
import { createVideoLoading } from "../components/video-loading"
import { createVideoUploadPrompt } from "../components/video-upload-prompt"
import { createBackButton } from "../components/back-button"
import { createProcessingButton } from "../components/processing-button"
import { iconSvg } from "../lib/icons"
import { createVideoUrl } from "../lib/video-url"
import { createVideoFramerate } from "../lib/video-framerate"
import { snapTimeToFrame, formatTime } from "../lib/time-utils"

/**
 * GIF page for converting a video segment to animated GIF.
 * Provides a video player with time selection, FPS/scale controls,
 * and a seekable timeline with selection overlay.
 */
export default function createGifPage(): Component {
  const container = document.createElement("div")
  container.className = "container mx-auto px-6 py-12 min-h-screen pt-20"

  const loading = createVideoLoading("Loading video data...")
  container.appendChild(loading.element)

  let activeChildren: Component[] = []
  let storeSub: (() => void) | null = null
  let revokeUrl: () => void = () => {}
  let framerateHandle: { getFramerateFps: () => number; destroy: () => void } | null = null

  // Mutable state
  let isPlaying = false
  let currentTimeSec = 0
  let durationSec = 0
  let startTimeSec: number | null = null
  let endTimeSec: number | null = null
  let fps = 10
  let scale = 480
  let processingBtn: Component | null = null

  waitForVideo().then(({ needsUpload }) => {
    loading.element.remove()

    if (needsUpload) {
      const prompt = createVideoUploadPrompt()
      activeChildren.push(prompt)
      container.appendChild(prompt.element)

      storeSub = subscribe(() => {
        if (getState().videoData) {
          storeSub?.()
          storeSub = null
          prompt.element.remove()
          renderPage()
        }
      })
      return
    }

    renderPage()
  })

  function snapTime(timeSec: number): number {
    const fr = framerateHandle ? framerateHandle.getFramerateFps() : 30
    return snapTimeToFrame(timeSec, fr, durationSec)
  }

  function getActionConfig(): ActionConfig {
    return {
      type: "gif",
      params: {
        start: startTimeSec !== null ? snapTime(startTimeSec).toFixed(2) : "0",
        end: endTimeSec !== null ? snapTime(endTimeSec).toFixed(2) : Math.min(durationSec, 3).toFixed(2),
        fps,
        scale,
      },
    }
  }

  function handleClearSelection(): void {
    startTimeSec = null
    endTimeSec = null
    updateTimeline()
    updateSelectionInfo()
    updateProcessingButton()
  }

  function renderPage(): void {
    const videoData = getState().videoData
    if (!videoData) return

    activeChildren.forEach((c) => c.destroy())
    activeChildren = []
    container.innerHTML = ""

    const urlResult = createVideoUrl(videoData.file)
    revokeUrl = urlResult.revoke

    const inner = document.createElement("div")
    inner.className = "max-w-6xl mx-auto space-y-6"

    // Top bar with back + clear
    const topBar = document.createElement("div")
    topBar.className = "flex items-center justify-between"
    const backBtn = createBackButton("/actions", "Back")
    activeChildren.push(backBtn)
    topBar.appendChild(backBtn.element)

    const clearBtn = document.createElement("button")
    clearBtn.className =
      "inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-transparent hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
    clearBtn.textContent = "Clear Selection"
    clearBtn.id = "gif-clear-btn"
    clearBtn.addEventListener("click", handleClearSelection)
    topBar.appendChild(clearBtn)
    inner.appendChild(topBar)

    const content = document.createElement("div")
    content.className = "space-y-4"

    // Video element
    const videoWrapper = document.createElement("div")
    videoWrapper.className = "relative aspect-video bg-black rounded-lg overflow-hidden"
    const videoEl = document.createElement("video")
    videoEl.src = urlResult.url
    videoEl.className = "w-full h-full object-contain"
    videoWrapper.appendChild(videoEl)
    content.appendChild(videoWrapper)

    // Controls: play/pause, mark start, mark end
    const controlsDiv = document.createElement("div")
    controlsDiv.className = "flex items-center justify-center gap-4"

    const playBtn = document.createElement("button")
    playBtn.className =
      "inline-flex items-center justify-center rounded-full border border-input bg-transparent hover:bg-accent hover:text-accent-foreground w-12 h-12"
    playBtn.innerHTML = iconSvg("Play", 20, "w-5 h-5 ml-0.5")
    controlsDiv.appendChild(playBtn)

    const markStartBtn = document.createElement("button")
    markStartBtn.className =
      "inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-transparent hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
    markStartBtn.textContent = "Mark Start"
    controlsDiv.appendChild(markStartBtn)

    const markEndBtn = document.createElement("button")
    markEndBtn.className =
      "inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-transparent hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
    markEndBtn.textContent = "Mark End"
    controlsDiv.appendChild(markEndBtn)

    content.appendChild(controlsDiv)

    // Timeline
    const timelineSection = document.createElement("div")
    timelineSection.className = "space-y-2"
    timelineSection.innerHTML = `
      <div id="gif-timeline" class="relative h-1.5 bg-secondary rounded-full cursor-pointer group">
        <div id="gif-progress" class="absolute top-0 left-0 h-full bg-accent rounded-full transition-all" style="width:0%"></div>
        <div id="gif-selection" class="absolute top-0 h-full bg-yellow-500/30 rounded-full" style="display:none"></div>
        <div id="gif-playhead" class="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-accent rounded-full shadow-lg transition-all" style="left:0%;margin-left:-0.5rem"></div>
        <div id="gif-start-marker" class="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-yellow-500 rounded-full shadow-lg" style="display:none;margin-left:-0.375rem"></div>
        <div id="gif-end-marker" class="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-yellow-500 rounded-full shadow-lg" style="display:none;margin-left:-0.375rem"></div>
      </div>
      <div class="flex justify-between text-sm text-muted-foreground">
        <span id="gif-current-time">0:00</span>
        <span id="gif-duration-time">0:00</span>
      </div>
    `
    content.appendChild(timelineSection)

    // Settings panel
    const settingsPanel = document.createElement("div")
    settingsPanel.className = "bg-secondary/50 rounded-lg p-6 space-y-6"
    settingsPanel.innerHTML = `
      <div class="space-y-2">
        <h3 class="text-lg font-semibold">GIF Settings</h3>
        <p class="text-sm text-muted-foreground">Select a portion of video and adjust GIF quality settings</p>
      </div>
      <div class="space-y-6">
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium leading-none">Frame Rate (FPS)</label>
            <span class="text-sm text-muted-foreground" id="gif-fps-label">${fps} fps</span>
          </div>
          <input type="range" id="gif-fps" min="5" max="30" step="5" value="${fps}"
            class="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[hsl(var(--accent))]" />
          <p class="text-xs text-muted-foreground">Lower FPS = smaller file size</p>
        </div>
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium leading-none">Width (pixels)</label>
            <span class="text-sm text-muted-foreground" id="gif-scale-label">${scale}px</span>
          </div>
          <input type="range" id="gif-scale" min="240" max="1080" step="120" value="${scale}"
            class="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[hsl(var(--accent))]" />
          <p class="text-xs text-muted-foreground">Smaller dimensions = smaller file size</p>
        </div>
      </div>
      <div id="gif-selection-info" style="display:none" class="bg-background/50 rounded p-4 text-sm space-y-1"></div>
      <div id="gif-processing"></div>
    `
    content.appendChild(settingsPanel)

    inner.appendChild(content)
    container.appendChild(inner)

    // Framerate detection
    framerateHandle = createVideoFramerate(videoEl)

    // Video events
    videoEl.addEventListener("loadedmetadata", () => {
      durationSec = videoEl.duration
      const durLabel = container.querySelector("#gif-duration-time")
      if (durLabel) durLabel.textContent = formatTime(durationSec)
    })

    videoEl.addEventListener("timeupdate", () => {
      currentTimeSec = videoEl.currentTime
      updateTimeline()
    })

    videoEl.addEventListener("play", () => {
      isPlaying = true
      playBtn.innerHTML = iconSvg("Pause", 20, "w-5 h-5")
    })
    videoEl.addEventListener("pause", () => {
      isPlaying = false
      playBtn.innerHTML = iconSvg("Play", 20, "w-5 h-5 ml-0.5")
    })

    playBtn.addEventListener("click", () => {
      if (isPlaying) videoEl.pause()
      else videoEl.play()
    })

    markStartBtn.addEventListener("click", () => {
      startTimeSec = snapTime(currentTimeSec)
      if (endTimeSec === null) {
        endTimeSec = Math.min(startTimeSec + 3, durationSec)
      }
      updateTimeline()
      updateSelectionInfo()
      updateProcessingButton()
    })

    markEndBtn.addEventListener("click", () => {
      endTimeSec = snapTime(currentTimeSec)
      updateTimeline()
      updateSelectionInfo()
      updateProcessingButton()
    })

    // Timeline click to seek
    const timeline = container.querySelector("#gif-timeline") as HTMLElement
    timeline.addEventListener("click", (e: MouseEvent) => {
      const rect = timeline.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percentage = x / rect.width
      const time = snapTime(percentage * durationSec)
      videoEl.currentTime = time
      currentTimeSec = time
      updateTimeline()
    })

    // Slider inputs
    const fpsInput = container.querySelector("#gif-fps") as HTMLInputElement
    const fpsLabel = container.querySelector("#gif-fps-label")!
    fpsInput.addEventListener("input", () => {
      fps = parseInt(fpsInput.value)
      fpsLabel.textContent = `${fps} fps`
      updateProcessingButton()
    })

    const scaleInput = container.querySelector("#gif-scale") as HTMLInputElement
    const scaleLabel = container.querySelector("#gif-scale-label")!
    scaleInput.addEventListener("input", () => {
      scale = parseInt(scaleInput.value)
      scaleLabel.textContent = `${scale}px`
      updateProcessingButton()
    })

    // Clear button state
    updateClearButton()
    updateProcessingButton()
  }

  function updateTimeline(): void {
    if (durationSec <= 0) return
    const pct = (currentTimeSec / durationSec) * 100

    const progress = container.querySelector("#gif-progress") as HTMLElement
    const playhead = container.querySelector("#gif-playhead") as HTMLElement
    const currentLabel = container.querySelector("#gif-current-time") as HTMLElement

    if (progress) progress.style.width = `${pct}%`
    if (playhead) playhead.style.left = `${pct}%`
    if (currentLabel) currentLabel.textContent = formatTime(currentTimeSec)

    // Selection overlay
    const selectionEl = container.querySelector("#gif-selection") as HTMLElement
    const startMarker = container.querySelector("#gif-start-marker") as HTMLElement
    const endMarker = container.querySelector("#gif-end-marker") as HTMLElement

    if (startTimeSec !== null && endTimeSec !== null) {
      const startPct = (startTimeSec / durationSec) * 100
      const endPct = (endTimeSec / durationSec) * 100
      if (selectionEl) {
        selectionEl.style.display = "block"
        selectionEl.style.left = `${startPct}%`
        selectionEl.style.width = `${endPct - startPct}%`
      }
    } else if (selectionEl) {
      selectionEl.style.display = "none"
    }

    if (startTimeSec !== null && startMarker) {
      startMarker.style.display = "block"
      startMarker.style.left = `${(startTimeSec / durationSec) * 100}%`
    } else if (startMarker) {
      startMarker.style.display = "none"
    }

    if (endTimeSec !== null && endMarker) {
      endMarker.style.display = "block"
      endMarker.style.left = `${(endTimeSec / durationSec) * 100}%`
    } else if (endMarker) {
      endMarker.style.display = "none"
    }

    updateClearButton()
  }

  function updateClearButton(): void {
    const clearBtn = container.querySelector("#gif-clear-btn") as HTMLButtonElement
    if (clearBtn) {
      clearBtn.disabled = startTimeSec === null && endTimeSec === null
      clearBtn.style.opacity = startTimeSec === null && endTimeSec === null ? "0.5" : "1"
    }
  }

  function updateSelectionInfo(): void {
    const infoEl = container.querySelector("#gif-selection-info") as HTMLElement
    if (!infoEl) return

    if (startTimeSec !== null || endTimeSec !== null) {
      infoEl.style.display = "block"
      infoEl.innerHTML = `
        <p class="text-muted-foreground">Start: ${startTimeSec !== null ? formatTime(startTimeSec) : "\u2014"}</p>
        <p class="text-muted-foreground">End: ${endTimeSec !== null ? formatTime(endTimeSec) : "\u2014"}</p>
        ${
          startTimeSec !== null && endTimeSec !== null
            ? `<p class="text-muted-foreground">Duration: ${formatTime(endTimeSec - startTimeSec)}</p>`
            : ""
        }
        <p class="text-muted-foreground">Re-encoding required: GIF export rebuilds frames.</p>
      `
    } else {
      infoEl.style.display = "none"
    }
  }

  function updateProcessingButton(): void {
    const procContainer = container.querySelector("#gif-processing") as HTMLElement
    if (!procContainer) return

    if (processingBtn) {
      processingBtn.destroy()
      const idx = activeChildren.indexOf(processingBtn)
      if (idx !== -1) activeChildren.splice(idx, 1)
    }
    procContainer.innerHTML = ""

    processingBtn = createProcessingButton({
      config: getActionConfig(),
      onReset: handleClearSelection,
    })
    activeChildren.push(processingBtn)
    procContainer.appendChild(processingBtn.element)
  }

  return {
    element: container,
    destroy: () => {
      activeChildren.forEach((c) => c.destroy())
      storeSub?.()
      revokeUrl()
      framerateHandle?.destroy()
    },
  }
}
