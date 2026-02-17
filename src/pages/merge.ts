import type { Component, ActionConfig } from "../types"
import { getState, subscribe } from "../store"
import { waitForVideo } from "../lib/require-video"
import { createVideoLoading } from "../components/video-loading"
import { createVideoUploadPrompt } from "../components/video-upload-prompt"
import { createBackButton } from "../components/back-button"
import { createProcessingButton } from "../components/processing-button"
import { iconSvg } from "../lib/icons"

/**
 * Merge page for combining audio with video.
 * Allows uploading a separate audio file to replace or add to the video's audio track.
 */
export default function createMergePage(): Component {
  const container = document.createElement("div")
  container.className = "container mx-auto px-6 py-12 min-h-screen pt-20"

  const loading = createVideoLoading("Loading video data...")
  container.appendChild(loading.element)

  let activeChildren: Component[] = []
  let unsub: (() => void) | null = null

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

    let audioFile: File | null = null

    const inner = document.createElement("div")
    inner.className = "max-w-4xl mx-auto space-y-6"

    const backBtn = createBackButton()
    activeChildren.push(backBtn)
    inner.appendChild(backBtn.element)

    const content = document.createElement("div")
    content.className = "space-y-6"

    // Page header
    const pageHeader = document.createElement("div")
    pageHeader.className = "space-y-2"
    pageHeader.innerHTML = `
      <h3 class="text-2xl font-semibold">Merge Audio with Video</h3>
      <p class="text-muted-foreground">Combine your video file with a separate audio track</p>
    `
    content.appendChild(pageHeader)

    // Grid: video info + audio upload
    const grid = document.createElement("div")
    grid.className = "grid md:grid-cols-2 gap-6"

    // Video file card
    const videoCard = document.createElement("div")
    videoCard.className = "bg-secondary/50 rounded-lg p-6 space-y-4"

    const videoSection = document.createElement("div")
    videoSection.className = "space-y-2"

    const videoLabel = document.createElement("label")
    videoLabel.className = "text-sm font-medium leading-none"
    videoLabel.textContent = "Video File"
    videoSection.appendChild(videoLabel)

    const videoInfo = document.createElement("div")
    videoInfo.className = "bg-background rounded-lg p-4 border border-border"

    const fileName = document.createElement("p")
    fileName.className = "font-medium truncate"
    fileName.textContent = videoData.file.name
    videoInfo.appendChild(fileName)

    const fileSize = document.createElement("p")
    fileSize.className = "text-sm text-muted-foreground mt-1"
    fileSize.textContent = formatFileSize(videoData.file.size)
    videoInfo.appendChild(fileSize)

    if (videoData.duration) {
      const dur = document.createElement("p")
      dur.className = "text-sm text-muted-foreground"
      const mins = Math.floor(videoData.duration / 60)
      const secs = Math.floor(videoData.duration % 60).toString().padStart(2, "0")
      dur.textContent = `Duration: ${mins}:${secs}`
      videoInfo.appendChild(dur)
    }

    videoSection.appendChild(videoInfo)
    videoCard.appendChild(videoSection)
    grid.appendChild(videoCard)

    // Audio file card
    const audioCard = document.createElement("div")
    audioCard.className = "bg-secondary/50 rounded-lg p-6 space-y-4"

    const audioSection = document.createElement("div")
    audioSection.className = "space-y-2"

    const audioLabel = document.createElement("label")
    audioLabel.className = "text-sm font-medium leading-none"
    audioLabel.textContent = "Audio File"
    audioSection.appendChild(audioLabel)

    const audioContent = document.createElement("div")
    audioSection.appendChild(audioContent)
    audioCard.appendChild(audioSection)
    grid.appendChild(audioCard)
    content.appendChild(grid)

    // Info text
    const infoBox = document.createElement("div")
    infoBox.className = "bg-background/50 border border-border rounded-lg p-4 text-sm"
    infoBox.innerHTML = `
      <p class="text-muted-foreground">The audio will replace any existing audio in the video. If the audio is longer or shorter than the video, it will be trimmed or extended accordingly.</p>
      <p class="text-muted-foreground mt-2">Re-encoding required: audio must be re-encoded.</p>
    `
    content.appendChild(infoBox)

    // Processing button container (only shown when audio is selected)
    const processingBtnContainer = document.createElement("div")
    content.appendChild(processingBtnContainer)

    let processingBtn: Component | null = null

    function getActionConfig(): ActionConfig {
      return {
        type: "merge",
        params: { audioFile },
      }
    }

    function updateProcessingButton(): void {
      if (processingBtn) {
        processingBtn.destroy()
        const idx = activeChildren.indexOf(processingBtn)
        if (idx !== -1) activeChildren.splice(idx, 1)
      }
      processingBtnContainer.innerHTML = ""

      if (audioFile) {
        processingBtn = createProcessingButton({
          config: getActionConfig(),
          onReset: () => {
            audioFile = null
            updateAudioContent()
            updateProcessingButton()
          },
        })
        activeChildren.push(processingBtn)
        processingBtnContainer.appendChild(processingBtn.element)
      }
    }

    function updateAudioContent(): void {
      audioContent.innerHTML = ""

      if (audioFile) {
        const audioInfo = document.createElement("div")
        audioInfo.className = "bg-background rounded-lg p-4 border border-border"

        const audioName = document.createElement("p")
        audioName.className = "font-medium truncate"
        audioName.textContent = audioFile.name
        audioInfo.appendChild(audioName)

        const audioSize = document.createElement("p")
        audioSize.className = "text-sm text-muted-foreground mt-1"
        audioSize.textContent = formatFileSize(audioFile.size)
        audioInfo.appendChild(audioSize)

        const removeBtn = document.createElement("button")
        removeBtn.className = "inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-transparent hover:bg-accent hover:text-accent-foreground h-8 px-3 mt-3"
        removeBtn.textContent = "Remove"
        removeBtn.addEventListener("click", () => {
          audioFile = null
          updateAudioContent()
          updateProcessingButton()
        })
        audioInfo.appendChild(removeBtn)

        audioContent.appendChild(audioInfo)
      } else {
        const uploadWrapper = document.createElement("div")

        const fileInput = document.createElement("input")
        fileInput.type = "file"
        fileInput.accept = "audio/*"
        fileInput.className = "hidden"
        fileInput.id = "audio-upload"
        fileInput.addEventListener("change", () => {
          const file = fileInput.files?.[0]
          if (file) {
            audioFile = file
            updateAudioContent()
            updateProcessingButton()
          }
        })
        uploadWrapper.appendChild(fileInput)

        const uploadLabel = document.createElement("label")
        uploadLabel.htmlFor = "audio-upload"
        uploadLabel.className = "inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-transparent hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full cursor-pointer"
        uploadLabel.innerHTML = `${iconSvg("Upload", 16, "w-4 h-4 mr-2")} Upload Audio File`
        uploadWrapper.appendChild(uploadLabel)

        const formatHint = document.createElement("p")
        formatHint.className = "text-xs text-muted-foreground mt-2"
        formatHint.textContent = "MP3, WAV, AAC, or other audio formats"
        uploadWrapper.appendChild(formatHint)

        audioContent.appendChild(uploadWrapper)
      }
    }

    updateAudioContent()
    updateProcessingButton()

    inner.appendChild(content)
    container.appendChild(inner)
  }

  /**
   * Formats bytes to a human-readable MB string.
   */
  function formatFileSize(bytes: number): string {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB"
  }

  return {
    element: container,
    destroy: () => {
      activeChildren.forEach((c) => c.destroy())
      unsub?.()
    },
  }
}
