import type { Component } from "../types"
import { setVideoData, getVideoData } from "../store"
import { getFileSizeWarningType } from "../lib/file-utils"
import { createFileSizeWarning } from "./file-size-warning"
import { createLogger } from "../lib/logger"
import { iconSvg } from "../lib/icons"

const log = createLogger("video-upload-prompt")

/**
 * Inline upload prompt shown when a page requires video data but none is loaded.
 * Handles file selection via drag-and-drop or click, extracts video metadata,
 * and sets the video data in the store.
 */
export function createVideoUploadPrompt(onVideoLoaded: () => void): Component {
  const wrapper = document.createElement("div")
  wrapper.className = "max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[400px] space-y-6 pt-14"

  wrapper.innerHTML = `
    <div class="text-center space-y-2">
      <h2 class="text-2xl font-bold">No video loaded</h2>
      <p class="text-muted-foreground">Upload a video to get started</p>
    </div>

    <label for="vup-file-input"
      class="relative flex flex-col items-center justify-center w-full min-h-[240px] rounded-2xl border-2 border-dashed border-border hover:border-muted-foreground/50 hover:bg-muted/50 cursor-pointer transition-all duration-300"
      id="vup-label">
      <input id="vup-file-input" type="file" accept="video/*" class="sr-only" />
      <div class="flex items-center justify-center w-14 h-14 rounded-2xl mb-4 bg-muted transition-colors duration-300" id="vup-icon">
        ${iconSvg("Upload", 28, "h-7 w-7 text-muted-foreground")}
      </div>
      <p class="text-base font-medium text-foreground" id="vup-text">Drag and drop a video</p>
      <p class="text-muted-foreground mt-1 text-sm">or click to browse files</p>
      <p class="text-xs text-muted-foreground mt-4">Supports MP4, WebM, MOV, AVI, MKV and more</p>
    </label>

    <div id="vup-error" class="hidden bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm"></div>
  `

  const label = wrapper.querySelector("#vup-label") as HTMLLabelElement
  const fileInput = wrapper.querySelector("#vup-file-input") as HTMLInputElement
  const errorDiv = wrapper.querySelector("#vup-error") as HTMLDivElement

  function handleFileSelect(file: File): void {
    const warningType = getFileSizeWarningType(file.size)
    if (warningType) {
      const warning = createFileSizeWarning(warningType, file.size, () => {}, () => processFile(file))
      document.body.appendChild(warning.element)
      ;(warning.element as HTMLDialogElement).showModal()
    } else {
      processFile(file)
    }
  }

  function processFile(file: File): void {
    errorDiv.classList.add("hidden")
    const video = document.createElement("video")
    video.preload = "metadata"
    video.playsInline = true
    const objectUrl = URL.createObjectURL(file)

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl)
      log.info("Video metadata loaded: %s (%dx%d, %ds)", file.name, video.videoWidth, video.videoHeight, video.duration)
      setVideoData({
        file,
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        format: file.name.split(".").pop()?.toUpperCase(),
      })
      onVideoLoaded()
      file.arrayBuffer().then((buffer) => {
        const current = getVideoData()
        if (current?.file === file) {
          setVideoData({ ...current, fileData: new Uint8Array(buffer) })
        }
      }).catch(() => {})
    }

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      errorDiv.textContent = "Unable to load video. The file may be corrupted or in an unsupported format."
      errorDiv.classList.remove("hidden")
    }

    video.src = objectUrl
  }

  label.addEventListener("dragover", (e) => { e.preventDefault() })
  label.addEventListener("dragleave", (e) => { e.preventDefault() })
  label.addEventListener("drop", (e) => {
    e.preventDefault()
    const files = (e as DragEvent).dataTransfer?.files
    if (files && files.length > 0 && files[0].type.startsWith("video/")) {
      handleFileSelect(files[0])
    }
  })
  fileInput.addEventListener("change", () => {
    if (fileInput.files && fileInput.files.length > 0) handleFileSelect(fileInput.files[0])
  })

  return { element: wrapper, destroy: () => {} }
}
