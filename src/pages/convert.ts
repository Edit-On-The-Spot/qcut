import type { Component, ActionConfig } from "../types"
import { getState, subscribe } from "../store"
import { waitForVideo } from "../lib/require-video"
import { createVideoLoading } from "../components/video-loading"
import { createVideoUploadPrompt } from "../components/video-upload-prompt"
import { createBackButton } from "../components/back-button"
import { createProcessingButton } from "../components/processing-button"
import { createVideoPreview } from "../components/video-preview"
import { createVideoUrl } from "../lib/video-url"
import { detectCodecs, CODEC_DISPLAY_NAMES } from "../lib/codec-detection"
import { iconSvg } from "../lib/icons"

/**
 * Convert page for changing video format and codec.
 * Defaults to copying the input codec (no re-encode).
 * Detects the current video codec using FFmpeg so the copy option
 * shows the actual codec name and re-encode options exclude the current codec.
 */
export default function createConvertPage(): Component {
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

    let format = "mp4"
    let codec = "copy"
    let detectedCodec: string | null = videoData.codec || null
    let audioCodec: string | null = null
    let isDetecting = false

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
    const headerDiv = document.createElement("div")
    headerDiv.className = "space-y-2"
    headerDiv.innerHTML = `
      <h3 class="text-lg font-semibold">Conversion Settings</h3>
      <p class="text-sm text-muted-foreground">Choose the output format and codec for your video</p>
    `
    settingsPanel.appendChild(headerDiv)

    // Format and codec selects grid
    const selectsGrid = document.createElement("div")
    selectsGrid.className = "grid md:grid-cols-2 gap-6"

    // Format select
    const formatDiv = document.createElement("div")
    formatDiv.className = "space-y-2"

    const formatLabel = document.createElement("label")
    formatLabel.className = "text-sm font-medium leading-none"
    formatLabel.textContent = "Output Format"
    formatDiv.appendChild(formatLabel)

    const formatSelect = document.createElement("select")
    formatSelect.className = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    formatSelect.innerHTML = `
      <option value="mp4">MP4</option>
      <option value="webm">WebM</option>
      <option value="avi">AVI</option>
      <option value="mov">MOV</option>
      <option value="mkv">MKV</option>
    `
    formatSelect.value = format
    formatSelect.addEventListener("change", () => {
      format = formatSelect.value
    })
    formatDiv.appendChild(formatSelect)
    selectsGrid.appendChild(formatDiv)

    // Codec select
    const codecDiv = document.createElement("div")
    codecDiv.className = "space-y-2"

    const codecLabel = document.createElement("label")
    codecLabel.className = "text-sm font-medium leading-none"
    codecLabel.textContent = "Video Codec"
    codecDiv.appendChild(codecLabel)

    const codecSelect = document.createElement("select")
    codecSelect.className = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"

    /** Rebuilds the codec select options based on detected codec. */
    function updateCodecSelect(): void {
      const detectedDisplay = detectedCodec
        ? CODEC_DISPLAY_NAMES[detectedCodec] || detectedCodec.toUpperCase()
        : null

      let copyLabel: string
      if (isDetecting) {
        copyLabel = "Detecting..."
      } else if (detectedDisplay) {
        copyLabel = `${detectedDisplay} (no re-encode)`
      } else {
        copyLabel = "Copy (no re-encode)"
      }

      let html = `<option value="copy">${copyLabel}</option>`

      if (detectedCodec !== "h264") {
        html += `<option value="libx264">H.264 (re-encode)</option>`
      }
      if (detectedCodec !== "hevc" && detectedCodec !== "h265") {
        html += `<option value="libx265">H.265 (re-encode)</option>`
      }
      if (detectedCodec !== "vp9") {
        html += `<option value="libvpx-vp9">VP9 (re-encode)</option>`
      }

      codecSelect.innerHTML = html
      codecSelect.value = codec
    }

    updateCodecSelect()

    codecSelect.addEventListener("change", () => {
      codec = codecSelect.value
      updateInfoSection()
    })
    codecDiv.appendChild(codecSelect)
    selectsGrid.appendChild(codecDiv)

    settingsPanel.appendChild(selectsGrid)

    // Info section
    const infoDiv = document.createElement("div")
    infoDiv.className = "bg-background/50 rounded p-4 text-sm space-y-1"

    function updateInfoSection(): void {
      const detectedDisplay = detectedCodec
        ? CODEC_DISPLAY_NAMES[detectedCodec] || detectedCodec.toUpperCase()
        : null

      let html = `<p class="text-muted-foreground">Current format: ${videoData!.format || "Unknown"}</p>`

      if (isDetecting) {
        html += `<p class="text-muted-foreground flex items-center gap-2">Input codec: ${iconSvg("Loader2", 12, "w-3 h-3 animate-spin inline")} Detecting...</p>`
      } else {
        html += `<p class="text-muted-foreground">Input codec: ${detectedDisplay || "Unknown"}</p>`
      }

      if (audioCodec) {
        html += `<p class="text-muted-foreground">Audio codec: ${audioCodec}</p>`
      }

      if (codec !== "copy") {
        html += `<p class="text-yellow-600 dark:text-yellow-500">Re-encoding to ${codec} will be slower and may reduce quality.</p>`
      }

      infoDiv.innerHTML = html
    }

    updateInfoSection()
    settingsPanel.appendChild(infoDiv)

    // Processing button
    const getActionConfig = (): ActionConfig => ({
      type: "convert",
      params: { format, codec },
    })

    const processBtn = createProcessingButton({ config: getActionConfig() })
    activeChildren.push(processBtn)
    settingsPanel.appendChild(processBtn.element)

    contentDiv.appendChild(settingsPanel)
    inner.appendChild(contentDiv)
    container.appendChild(inner)

    // Start codec detection when FFmpeg is ready
    startCodecDetection()

    function startCodecDetection(): void {
      const { isFFmpegLoaded, ffmpeg } = getState()

      if (isFFmpegLoaded && ffmpeg && !detectedCodec) {
        runDetection()
      } else if (!isFFmpegLoaded) {
        // Wait for FFmpeg to load
        const detectionUnsub = subscribe(() => {
          const state = getState()
          if (state.isFFmpegLoaded && state.ffmpeg) {
            detectionUnsub()
            if (!detectedCodec) {
              runDetection()
            }
          }
        })

        // Track the unsub for cleanup on destroy
        activeChildren.push({
          element: document.createElement("span"),
          destroy: () => detectionUnsub(),
        })
      }
    }

    async function runDetection(): Promise<void> {
      isDetecting = true
      updateCodecSelect()
      updateInfoSection()

      const info = await detectCodecs()

      isDetecting = false

      if (info) {
        if (info.videoCodec) {
          detectedCodec = info.videoCodec
        }
        if (info.audioCodec) {
          audioCodec = info.audioCodec
        }
      }

      updateCodecSelect()
      updateInfoSection()
    }
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
