import type { Component, ActionType } from "../types"
import { getState, subscribe } from "../store"
import { navigate } from "../router"
import { waitForVideo } from "../lib/require-video"
import { createVideoLoading } from "../components/video-loading"
import { createVideoUploadPrompt } from "../components/video-upload-prompt"
import { createBackButton } from "../components/back-button"
import { trackActionSelect } from "../lib/analytics"
import { iconSvg } from "../lib/icons"
import { formatFileSize } from "../lib/file-utils"

const actions: Array<{
  type: ActionType
  label: string
  description: string
  iconName: string
}> = [
  { type: "trim", label: "Cut/Trim", description: "Cut and trim video segments", iconName: "Scissors" },
  { type: "convert", label: "Convert Format", description: "Change video format (MP4, WebM, AVI, etc.)", iconName: "Repeat" },
  { type: "extract-audio", label: "Extract Audio", description: "Extract audio track from video", iconName: "Music" },
  { type: "compress", label: "Compress Video", description: "Reduce file size while maintaining quality", iconName: "Minimize2" },
  { type: "resize", label: "Resize", description: "Change video dimensions", iconName: "Maximize2" },
  { type: "merge", label: "Merge Audio+Video", description: "Combine separate audio and video files", iconName: "Merge" },
  { type: "combine", label: "Combine Clips", description: "Concatenate multiple video clips", iconName: "Layers" },
  { type: "frame-extract", label: "Frame Extract", description: "Extract frames as images", iconName: "Grid3x3" },
  { type: "gif", label: "Create GIF", description: "Convert video to animated GIF", iconName: "ImageIcon" },
  { type: "normalize-audio", label: "Normalize Audio", description: "Adjust audio levels for consistent loudness", iconName: "Volume2" },
  { type: "rotate", label: "Rotate / Flip", description: "Rotate or flip your video", iconName: "RotateCw" },
  { type: "overlay", label: "Add Overlay", description: "Add image watermark or overlay", iconName: "Image" },
]

function formatDuration(seconds?: number): string {
  if (!seconds) return "N/A"
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

/**
 * Actions screen for selecting video operations.
 */
export default function createActionsPage(): Component {
  const container = document.createElement("div")
  container.className = "container mx-auto px-6 py-12 min-h-screen pt-20"

  // Show loading initially
  const loading = createVideoLoading("Loading video data...")
  container.appendChild(loading.element)

  let activeChildren: Component[] = []
  let unsub: (() => void) | null = null

  // Wait for video data
  waitForVideo().then(({ isReady, needsUpload }) => {
    loading.element.remove()

    if (needsUpload) {
      const prompt = createVideoUploadPrompt()
      activeChildren.push(prompt)
      container.appendChild(prompt.element)

      // Watch for video data to appear
      unsub = subscribe(() => {
        if (getState().videoData) {
          unsub?.()
          unsub = null
          prompt.element.remove()
          renderActions()
        }
      })
      return
    }

    renderActions()
  })

  function renderActions(): void {
    const videoData = getState().videoData
    if (!videoData) return

    // Clean previous children
    activeChildren.forEach((c) => c.destroy())
    activeChildren = []
    container.innerHTML = ""

    const inner = document.createElement("div")
    inner.className = "max-w-5xl mx-auto space-y-8"

    // Back button
    const backBtn = createBackButton("/", "Back")
    activeChildren.push(backBtn)
    const backRow = document.createElement("div")
    backRow.className = "flex items-center justify-between"
    backRow.appendChild(backBtn.element)
    inner.appendChild(backRow)

    // Video info card with thumbnail
    const card = document.createElement("div")
    card.className = "rounded-xl border bg-card text-card-foreground shadow-sm p-6"
    card.innerHTML = `
      <div class="flex flex-wrap items-center gap-4">
        <div class="w-24 h-16 rounded-lg bg-muted overflow-hidden flex-shrink-0" id="thumb-container">
          <div class="w-full h-full flex items-center justify-center">
            <div class="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-medium truncate">${videoData.file.name}</p>
          <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>${formatDuration(videoData.duration)}</span>
            <span>${videoData.width && videoData.height ? `${videoData.width}×${videoData.height}` : "N/A"}</span>
            <span>${formatFileSize(videoData.file.size)}</span>
            <span>${videoData.format || ""}</span>
          </div>
        </div>
        <div class="flex items-center gap-2 text-sm text-green-500 flex-shrink-0">
          ${iconSvg("CheckCircle2", 16, "w-4 h-4")}
          <span>Ready for processing</span>
        </div>
      </div>
    `
    inner.appendChild(card)

    // Generate thumbnail in background
    generateThumbnail(videoData.file, card.querySelector("#thumb-container")!)

    // Header
    const header = document.createElement("div")
    header.className = "text-center space-y-2"
    header.innerHTML = `
      <h2 class="text-3xl font-bold">Choose Action</h2>
      <p class="text-muted-foreground">Select an operation to perform on your video</p>
    `
    inner.appendChild(header)

    // Action cards grid
    const grid = document.createElement("div")
    grid.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"

    for (const action of actions) {
      const actionCard = document.createElement("div")
      actionCard.className = "rounded-xl border bg-card text-card-foreground shadow-sm p-6 border-2 border-transparent hover:border-primary transition-all cursor-pointer group"
      actionCard.innerHTML = `
        <div class="space-y-4">
          <div class="w-12 h-12 rounded-lg bg-secondary group-hover:bg-primary flex items-center justify-center transition-colors">
            ${iconSvg(action.iconName, 24, "w-6 h-6 text-muted-foreground group-hover:text-primary-foreground transition-colors")}
          </div>
          <div class="space-y-1">
            <h3 class="font-semibold">${action.label}</h3>
            <p class="text-sm text-muted-foreground leading-relaxed">${action.description}</p>
          </div>
        </div>
      `
      actionCard.addEventListener("click", () => {
        trackActionSelect(action.type)
        navigate(`/${action.type}`)
      })
      grid.appendChild(actionCard)
    }
    inner.appendChild(grid)
    container.appendChild(inner)
  }

  return {
    element: container,
    destroy: () => {
      activeChildren.forEach((c) => c.destroy())
      unsub?.()
    },
  }
}

function generateThumbnail(file: File, container: HTMLElement): void {
  const video = document.createElement("video")
  const objectUrl = URL.createObjectURL(file)
  video.src = objectUrl
  video.preload = "metadata"
  video.muted = true

  video.onloadeddata = () => {
    video.currentTime = Math.min(1, (video.duration || 1) * 0.1)
  }

  video.onseeked = () => {
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.drawImage(video, 0, 0)
      const img = document.createElement("img")
      img.src = canvas.toDataURL("image/jpeg", 0.7)
      img.alt = "Video thumbnail"
      img.className = "w-full h-full object-cover"
      container.innerHTML = ""
      container.appendChild(img)
    }
    URL.revokeObjectURL(objectUrl)
  }

  video.onerror = () => URL.revokeObjectURL(objectUrl)
}
