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

/**
 * Extract audio/video page for pulling an audio track from video
 * or removing audio to produce a silent video.
 * Supports extracting audio in multiple formats (mp3/wav/aac/flac/ogg)
 * or extracting video without audio in mp4/webm/mov.
 */
export default function createExtractAudioPage(): Component {
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

    let extractMode: "audio" | "video" = "audio"
    let format = "mp3"
    let bitrate = "192k"
    let videoFormat = "mp4"

    const inner = document.createElement("div")
    inner.className = "max-w-6xl mx-auto space-y-6"

    // Back button
    const backBtn = createBackButton()
    activeChildren.push(backBtn)
    inner.appendChild(backBtn.element)

    // Content wrapper
    const contentDiv = document.createElement("div")
    contentDiv.className = "space-y-4"

    // Video preview with overlay
    const preview = createVideoPreview({ src: videoUrl.url })
    activeChildren.push(preview)

    // Add overlay to the video wrapper (first child of preview.element is the aspect-video div)
    const videoWrapper = preview.element.querySelector(".aspect-video")
    const overlay = document.createElement("div")
    overlay.className = "absolute inset-0 bg-black/50 flex items-center justify-center"

    function updateOverlay(): void {
      if (extractMode === "audio") {
        overlay.innerHTML = `
          <div class="text-center space-y-3">
            ${iconSvg("Volume2", 64, "w-16 h-16 mx-auto text-white/80")}
            <p class="text-white/80 text-sm">Audio will be extracted from this video</p>
          </div>
        `
      } else {
        overlay.innerHTML = `
          <div class="text-center space-y-3">
            ${iconSvg("VolumeX", 64, "w-16 h-16 mx-auto text-white/80")}
            <p class="text-white/80 text-sm">Audio will be removed from this video</p>
          </div>
        `
      }
    }

    updateOverlay()
    videoWrapper?.appendChild(overlay)
    contentDiv.appendChild(preview.element)

    // Settings panel
    const settingsPanel = document.createElement("div")
    settingsPanel.className = "bg-secondary/50 rounded-lg p-6 space-y-6"

    // Header
    const headerDiv = document.createElement("div")
    headerDiv.className = "space-y-2"
    headerDiv.innerHTML = `
      <h3 class="text-lg font-semibold">Extract Audio or Video</h3>
      <p class="text-sm text-muted-foreground">
        Extract the audio track, or remove audio to get a silent video
      </p>
    `
    settingsPanel.appendChild(headerDiv)

    // Extraction mode toggle
    const modeSection = document.createElement("div")
    modeSection.className = "space-y-2"

    const modeLabel = document.createElement("label")
    modeLabel.className = "text-sm font-medium leading-none"
    modeLabel.textContent = "Extraction Mode"
    modeSection.appendChild(modeLabel)

    const modeButtonsDiv = document.createElement("div")
    modeButtonsDiv.className = "flex gap-2"

    const audioModeBtn = document.createElement("button")
    const videoModeBtn = document.createElement("button")

    function updateModeButtons(): void {
      const activeClass = "inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 bg-accent text-accent-foreground"
      const inactiveClass = "inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 border border-input bg-transparent hover:bg-accent hover:text-accent-foreground"

      audioModeBtn.className = extractMode === "audio" ? activeClass : inactiveClass
      audioModeBtn.innerHTML = `${iconSvg("Volume2", 16, "w-4 h-4 mr-2")} Extract Audio`

      videoModeBtn.className = extractMode === "video" ? activeClass : inactiveClass
      videoModeBtn.innerHTML = `${iconSvg("VolumeX", 16, "w-4 h-4 mr-2")} Remove Audio (Mute)`
    }

    updateModeButtons()

    audioModeBtn.addEventListener("click", () => {
      extractMode = "audio"
      updateModeButtons()
      updateOverlay()
      updateOptionsSection()
      updateProcessingButton()
    })

    videoModeBtn.addEventListener("click", () => {
      extractMode = "video"
      updateModeButtons()
      updateOverlay()
      updateOptionsSection()
      updateProcessingButton()
    })

    modeButtonsDiv.appendChild(audioModeBtn)
    modeButtonsDiv.appendChild(videoModeBtn)
    modeSection.appendChild(modeButtonsDiv)
    settingsPanel.appendChild(modeSection)

    // Options section (changes based on mode)
    const optionsSection = document.createElement("div")

    function updateOptionsSection(): void {
      optionsSection.innerHTML = ""

      if (extractMode === "audio") {
        optionsSection.className = "grid md:grid-cols-2 gap-6"

        // Audio format select
        const formatDiv = document.createElement("div")
        formatDiv.className = "space-y-2"

        const formatLabel = document.createElement("label")
        formatLabel.className = "text-sm font-medium leading-none"
        formatLabel.textContent = "Output Format"
        formatDiv.appendChild(formatLabel)

        const formatSelect = document.createElement("select")
        formatSelect.className = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        formatSelect.innerHTML = `
          <option value="mp3">MP3</option>
          <option value="wav">WAV</option>
          <option value="aac">AAC</option>
          <option value="flac">FLAC (lossless)</option>
          <option value="ogg">OGG</option>
        `
        formatSelect.value = format
        formatSelect.addEventListener("change", () => {
          format = formatSelect.value
          updateProcessingButton()
        })
        formatDiv.appendChild(formatSelect)
        optionsSection.appendChild(formatDiv)

        // Bitrate select
        const bitrateDiv = document.createElement("div")
        bitrateDiv.className = "space-y-2"

        const bitrateLabel = document.createElement("label")
        bitrateLabel.className = "text-sm font-medium leading-none"
        bitrateLabel.textContent = "Audio Bitrate"
        bitrateDiv.appendChild(bitrateLabel)

        const bitrateSelect = document.createElement("select")
        bitrateSelect.className = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        bitrateSelect.innerHTML = `
          <option value="128k">128 kbps</option>
          <option value="192k">192 kbps (recommended)</option>
          <option value="256k">256 kbps</option>
          <option value="320k">320 kbps (highest)</option>
        `
        bitrateSelect.value = bitrate
        bitrateSelect.addEventListener("change", () => {
          bitrate = bitrateSelect.value
          updateProcessingButton()
        })
        bitrateDiv.appendChild(bitrateSelect)
        optionsSection.appendChild(bitrateDiv)
      } else {
        optionsSection.className = "space-y-2"

        const videoFormatLabel = document.createElement("label")
        videoFormatLabel.className = "text-sm font-medium leading-none"
        videoFormatLabel.textContent = "Video Format"
        optionsSection.appendChild(videoFormatLabel)

        const videoFormatSelect = document.createElement("select")
        videoFormatSelect.className = "flex h-10 w-full md:w-1/2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        videoFormatSelect.innerHTML = `
          <option value="mp4">MP4</option>
          <option value="webm">WebM</option>
          <option value="mov">MOV</option>
        `
        videoFormatSelect.value = videoFormat
        videoFormatSelect.addEventListener("change", () => {
          videoFormat = videoFormatSelect.value
          updateProcessingButton()
        })
        optionsSection.appendChild(videoFormatSelect)

        const note = document.createElement("p")
        note.className = "text-xs text-muted-foreground mt-2"
        note.textContent = "The video will be copied without re-encoding for fast processing"
        optionsSection.appendChild(note)
      }
    }

    updateOptionsSection()
    settingsPanel.appendChild(optionsSection)

    // Duration info
    if (videoData.duration) {
      const durationDiv = document.createElement("div")
      durationDiv.className = "bg-background/50 rounded p-4 text-sm"
      const minutes = Math.floor(videoData.duration / 60)
      const seconds = Math.floor(videoData.duration % 60).toString().padStart(2, "0")
      durationDiv.innerHTML = `<p class="text-muted-foreground">Duration: ${minutes}:${seconds}</p>`
      settingsPanel.appendChild(durationDiv)
    }

    // Processing button
    const getActionConfig = (): ActionConfig => ({
      type: "extract-audio",
      params: {
        extractMode,
        format,
        bitrate,
        videoFormat,
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
