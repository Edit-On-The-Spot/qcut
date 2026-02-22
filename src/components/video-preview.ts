import type { Component } from "../types"
import { iconSvg } from "../lib/icons"

interface VideoPreviewOptions {
  src: string
  showControls?: boolean
  onLoadedMetadata?: (durationSec: number, width: number, height: number) => void
  onTimeUpdate?: (currentTimeSec: number) => void
  className?: string
}

/**
 * Reusable video preview component with play/pause controls.
 * Returns the component plus a handle for programmatic video control.
 */
export function createVideoPreview(options: VideoPreviewOptions): Component & {
  video: HTMLVideoElement
  seekTo: (timeSec: number) => void
  play: () => void
  pause: () => void
  togglePlay: () => void
} {
  const container = document.createElement("div")
  container.className = `space-y-4 ${options.className || ""}`

  const videoWrapper = document.createElement("div")
  videoWrapper.className = "relative aspect-video bg-black rounded-lg overflow-hidden"

  const video = document.createElement("video")
  video.src = options.src
  video.className = "w-full h-full object-contain"
  video.playsInline = true
  videoWrapper.appendChild(video)
  container.appendChild(videoWrapper)

  let isPlaying = false

  // Play/Pause button
  let controlBtn: HTMLButtonElement | null = null
  if (options.showControls !== false) {
    const controlsDiv = document.createElement("div")
    controlsDiv.className = "flex items-center justify-center"
    controlBtn = document.createElement("button")
    controlBtn.className = "inline-flex items-center justify-center rounded-full border border-input bg-transparent hover:bg-accent hover:text-accent-foreground w-12 h-12"
    controlBtn.innerHTML = iconSvg("Play", 20, "w-5 h-5 ml-0.5")
    controlsDiv.appendChild(controlBtn)
    container.appendChild(controlsDiv)
  }

  function updatePlayButton(): void {
    if (controlBtn) {
      controlBtn.innerHTML = isPlaying
        ? iconSvg("Pause", 20, "w-5 h-5")
        : iconSvg("Play", 20, "w-5 h-5 ml-0.5")
    }
  }

  const handleMeta = () => {
    options.onLoadedMetadata?.(video.duration, video.videoWidth, video.videoHeight)
  }
  const handleTime = () => {
    options.onTimeUpdate?.(video.currentTime)
  }
  const handlePlay = () => { isPlaying = true; updatePlayButton() }
  const handlePause = () => { isPlaying = false; updatePlayButton() }

  video.addEventListener("loadedmetadata", handleMeta)
  video.addEventListener("timeupdate", handleTime)
  video.addEventListener("play", handlePlay)
  video.addEventListener("pause", handlePause)

  const togglePlay = () => {
    if (isPlaying) video.pause()
    else video.play()
  }

  controlBtn?.addEventListener("click", togglePlay)

  return {
    element: container,
    video,
    seekTo: (t: number) => { video.currentTime = t },
    play: () => video.play(),
    pause: () => video.pause(),
    togglePlay,
    destroy: () => {
      video.removeEventListener("loadedmetadata", handleMeta)
      video.removeEventListener("timeupdate", handleTime)
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
      video.pause()
      video.src = ""
    },
  }
}
