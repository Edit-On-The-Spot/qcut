import type { Component, ActionConfig } from "../types"
import { VideoProcessor } from "../lib/video-processor"
import { getState, subscribe, resetVideo } from "../store"
import { iconSvg } from "../lib/icons"

/**
 * Formats a duration in milliseconds to a human-readable string.
 */
function formatDuration(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`
}

function formatWallClockTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

interface ProcessingButtonOptions {
  config: ActionConfig
  onReset?: () => void
}

/**
 * Button component that handles video processing and download.
 * Shows loading state during processing and download/reset options when complete.
 */
export function createProcessingButton(options: ProcessingButtonOptions): Component & { processor: VideoProcessor } {
  const container = document.createElement("div")
  const processor = new VideoProcessor()
  let etaInterval: ReturnType<typeof setInterval> | null = null

  const storeUnsub = subscribe(() => render())

  function render(): void {
    const ps = processor.getState()
    const appState = getState()
    const isLoaded = appState.isFFmpegLoaded
    const requiresFfmpeg = !(options.config.type === "frame-extract" && options.config.params.mode === "single")

    container.innerHTML = ""

    if (ps.error) {
      container.innerHTML = `
        <div class="space-y-3">
          <div class="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">${ps.error}</div>
          <button id="pb-retry" class="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full">Try Again</button>
        </div>
      `
      container.querySelector("#pb-retry")?.addEventListener("click", () => { processor.reset(); render() })
      return
    }

    if (ps.isProcessing) {
      let etaHtml = ""
      if (ps.processingStartTimeMs && ps.progress > 0 && ps.progress < 100) {
        const elapsedMs = performance.now() - ps.processingStartTimeMs
        const estimatedTotalMs = elapsedMs / (ps.progress / 100)
        const remainingMs = Math.max(0, estimatedTotalMs - elapsedMs)
        const completionTime = new Date(Date.now() + remainingMs)
        etaHtml = `<div class="text-sm text-muted-foreground text-center">${formatDuration(remainingMs)} remaining · Done by ${formatWallClockTime(completionTime)}</div>`
      }

      container.innerHTML = `
        <div class="space-y-3">
          <button disabled class="inline-flex items-center justify-center rounded-md text-sm font-medium bg-accent text-accent-foreground h-10 px-4 py-2 w-full opacity-80 cursor-not-allowed">
            ${iconSvg("Loader2", 16, "w-4 h-4 mr-2 animate-spin")} Processing... ${ps.progress}%
          </button>
          <div class="h-2 bg-secondary rounded-full overflow-hidden">
            <div class="h-full bg-accent transition-all duration-300" style="width:${ps.progress}%"></div>
          </div>
          ${etaHtml}
        </div>
      `
      return
    }

    if (ps.isComplete) {
      if (etaInterval) { clearInterval(etaInterval); etaInterval = null }
      container.innerHTML = `
        <div class="space-y-3">
          <div class="flex items-center gap-2 text-accent text-sm">
            ${iconSvg("CheckCircle2", 16, "w-4 h-4")}
            <span>Complete! File downloaded.</span>
          </div>
          <div class="flex gap-3">
            <button id="pb-download" class="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 flex-1">
              ${iconSvg("Download", 16, "w-4 h-4 mr-2")} Download Again
            </button>
            <button id="pb-reset" class="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 flex-1">
              ${iconSvg("RotateCcw", 16, "w-4 h-4 mr-2")} Start Over
            </button>
          </div>
        </div>
      `
      container.querySelector("#pb-download")?.addEventListener("click", () => processor.download(options.config))
      container.querySelector("#pb-reset")?.addEventListener("click", () => {
        processor.reset()
        if (options.onReset) options.onReset()
        else resetVideo()
        render()
      })
      return
    }

    // Default: Process button
    const isDisabled = requiresFfmpeg && !isLoaded
    container.innerHTML = `
      <button id="pb-process" class="inline-flex items-center justify-center rounded-md text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/90 h-10 px-4 py-2 w-full ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}" ${isDisabled ? "disabled" : ""}>
        ${isLoaded || !requiresFfmpeg
          ? `${iconSvg("Download", 16, "w-4 h-4 mr-2")} Process & Download`
          : `${iconSvg("Loader2", 16, "w-4 h-4 mr-2 animate-spin")} Loading Qcut...`
        }
      </button>
    `
    container.querySelector("#pb-process")?.addEventListener("click", async () => {
      await processor.process(options.config)
      render()
    })
  }

  // Subscribe to processor state changes
  const processorUnsub = processor.subscribe(() => render())

  // Initial render
  render()

  // Update ETA periodically during processing
  etaInterval = setInterval(() => {
    if (processor.getState().isProcessing) render()
  }, 1000)

  return {
    element: container,
    processor,
    destroy: () => {
      storeUnsub()
      processorUnsub()
      if (etaInterval) clearInterval(etaInterval)
    },
  }
}
