import type { Component } from "../types"
import { iconSvg } from "../lib/icons"
import { getFileSizeWarningType } from "../lib/file-utils"
import { createFileSizeWarning } from "./file-size-warning"

/**
 * Modal dialog for selecting a video file.
 * Used when user clicks an action without having a video loaded.
 * Uses native <dialog> element.
 */
export function createFileSelectModal(
  title: string,
  onFileSelect: (file: File) => void,
  onClose: () => void
): Component {
  const dialog = document.createElement("dialog")
  dialog.className = "rounded-2xl border bg-card shadow-xl backdrop:bg-black/50 w-full max-w-md p-0"

  dialog.innerHTML = `
    <div class="relative p-6">
      <button id="fsm-close" class="absolute top-4 right-4 p-1 rounded-full hover:bg-muted transition-colors" aria-label="Close modal">
        ${iconSvg("X", 20, "w-5 h-5 text-muted-foreground")}
      </button>

      <h2 class="text-xl font-semibold text-center mb-2">${title}</h2>
      <p class="text-sm text-muted-foreground text-center mb-6">Select a video file to get started</p>

      <label for="fsm-file-input"
        class="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
        id="fsm-dropzone">
        <input id="fsm-file-input" type="file" accept="video/*" class="sr-only" />
        <div class="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
          ${iconSvg("Upload", 24, "w-6 h-6 text-muted-foreground")}
        </div>
        <p class="font-medium text-foreground">Drop a video here</p>
        <p class="text-sm text-muted-foreground mt-1">or click to browse</p>
      </label>

      <p class="text-xs text-muted-foreground text-center mt-4">Supports MP4, WebM, MOV, AVI, MKV and more</p>
    </div>
  `

  const closeBtn = dialog.querySelector("#fsm-close")!
  const fileInput = dialog.querySelector("#fsm-file-input") as HTMLInputElement
  const dropzone = dialog.querySelector("#fsm-dropzone")!

  const close = () => {
    dialog.close()
    onClose()
  }

  closeBtn.addEventListener("click", close)
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) close()
  })

  function validateAndSelect(file: File): void {
    const warningType = getFileSizeWarningType(file.size)
    if (warningType) {
      const warning = createFileSizeWarning(warningType, file.size, () => {}, () => {
        dialog.close()
        onFileSelect(file)
      })
      document.body.appendChild(warning.element)
      ;(warning.element as HTMLDialogElement).showModal()
    } else {
      dialog.close()
      onFileSelect(file)
    }
  }

  fileInput.addEventListener("change", () => {
    if (fileInput.files && fileInput.files.length > 0) {
      validateAndSelect(fileInput.files[0])
    }
  })

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault()
    const files = (e as DragEvent).dataTransfer?.files
    if (files && files.length > 0 && files[0].type.startsWith("video/")) {
      validateAndSelect(files[0])
    }
  })

  dropzone.addEventListener("dragover", (e) => e.preventDefault())

  document.body.appendChild(dialog)
  dialog.showModal()

  return {
    element: dialog,
    destroy: () => dialog.remove(),
  }
}
