import type { Component } from "../../types"
import { iconSvg } from "../../lib/icons"

/**
 * Drag-and-drop file selection zone for video files.
 * Provides visual feedback during drag operations.
 */
export function createDropzone(onFileSelect: (file: File) => void): Component {
  const wrapper = document.createElement("div")
  wrapper.className = "px-6 pb-16 opacity-0 animate-fade-in-up animation-delay-400"
  wrapper.innerHTML = `
    <div class="max-w-4xl mx-auto">
      <label for="dz-video-select"
        class="relative flex flex-col items-center justify-center min-h-[360px] rounded-2xl border-2 border-dashed border-border hover:border-muted-foreground/50 hover:bg-muted/50 cursor-pointer transition-all duration-300"
        id="dz-label">
        <input id="dz-video-select" type="file" accept="video/*" class="sr-only" />

        <div class="flex items-center justify-center w-16 h-16 rounded-2xl mb-6 bg-muted transition-colors duration-300" id="dz-icon-box">
          ${iconSvg("Upload", 32, "h-8 w-8 text-muted-foreground")}
        </div>

        <p class="text-lg font-medium text-foreground" id="dz-text">Drag and drop a video</p>
        <p class="text-muted-foreground mt-1">or click to browse files</p>
        <p class="text-xs text-muted-foreground mt-6">Supports MP4, WebM, MOV, AVI, MKV and more</p>
      </label>
    </div>
  `

  const label = wrapper.querySelector("#dz-label") as HTMLLabelElement
  const input = wrapper.querySelector("#dz-video-select") as HTMLInputElement
  const iconBox = wrapper.querySelector("#dz-icon-box") as HTMLDivElement
  const dzText = wrapper.querySelector("#dz-text") as HTMLParagraphElement

  function setDragging(isDragging: boolean): void {
    if (isDragging) {
      label.classList.remove("border-border", "hover:border-muted-foreground/50", "hover:bg-muted/50")
      label.classList.add("border-primary", "bg-primary/5", "scale-[1.01]")
      iconBox.classList.remove("bg-muted")
      iconBox.classList.add("bg-primary/10")
      iconBox.innerHTML = iconSvg("Film", 32, "h-8 w-8 text-primary")
      dzText.textContent = "Drop your video here"
    } else {
      label.classList.add("border-border", "hover:border-muted-foreground/50", "hover:bg-muted/50")
      label.classList.remove("border-primary", "bg-primary/5", "scale-[1.01]")
      iconBox.classList.add("bg-muted")
      iconBox.classList.remove("bg-primary/10")
      iconBox.innerHTML = iconSvg("Upload", 32, "h-8 w-8 text-muted-foreground")
      dzText.textContent = "Drag and drop a video"
    }
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const files = e.dataTransfer?.files
    if (files && files.length > 0 && files[0].type.startsWith("video/")) {
      onFileSelect(files[0])
    }
  }

  const handleInput = () => {
    if (input.files && input.files.length > 0) {
      onFileSelect(input.files[0])
    }
  }

  label.addEventListener("dragover", handleDragOver)
  label.addEventListener("dragleave", handleDragLeave)
  label.addEventListener("drop", handleDrop)
  input.addEventListener("change", handleInput)

  return {
    element: wrapper,
    destroy: () => {
      label.removeEventListener("dragover", handleDragOver)
      label.removeEventListener("dragleave", handleDragLeave)
      label.removeEventListener("drop", handleDrop)
      input.removeEventListener("change", handleInput)
    },
  }
}
