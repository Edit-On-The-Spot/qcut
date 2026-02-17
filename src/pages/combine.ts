import type { Component, ActionConfig } from "../types"
import { getState, subscribe } from "../store"
import { waitForVideo } from "../lib/require-video"
import { createVideoLoading } from "../components/video-loading"
import { createVideoUploadPrompt } from "../components/video-upload-prompt"
import { createBackButton } from "../components/back-button"
import { createProcessingButton } from "../components/processing-button"
import { iconSvg } from "../lib/icons"
import { formatFileSize } from "../lib/file-utils"

/**
 * Combine page for concatenating multiple video clips into one.
 * Allows adding, removing, and viewing clips before processing.
 */
export default function createCombinePage(): Component {
  const container = document.createElement("div")
  container.className = "container mx-auto px-6 py-12 min-h-screen pt-20"

  const loading = createVideoLoading("Loading video data...")
  container.appendChild(loading.element)

  let activeChildren: Component[] = []
  let unsub: (() => void) | null = null
  let clips: File[] = []
  let processingBtn: Component | null = null

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

    if (clips.length === 0) {
      clips = [videoData.file]
    }

    const inner = document.createElement("div")
    inner.className = "max-w-4xl mx-auto space-y-6"

    const backBtn = createBackButton("/actions", "Back")
    activeChildren.push(backBtn)
    inner.appendChild(backBtn.element)

    const content = document.createElement("div")
    content.className = "space-y-6"

    content.innerHTML = `
      <div class="space-y-2">
        <h3 class="text-2xl font-semibold">Combine Video Clips</h3>
        <p class="text-muted-foreground">Add multiple video files to combine them into one</p>
      </div>
    `

    const panel = document.createElement("div")
    panel.className = "bg-secondary/50 rounded-lg p-6 space-y-4"
    content.appendChild(panel)

    const infoPanel = document.createElement("div")
    infoPanel.className = "bg-background/50 border border-border rounded-lg p-4 text-sm"
    content.appendChild(infoPanel)

    const processingContainer = document.createElement("div")
    processingContainer.id = "combine-processing"
    content.appendChild(processingContainer)

    inner.appendChild(content)
    container.appendChild(inner)

    renderClipsList(panel, infoPanel, processingContainer)
  }

  function renderClipsList(
    panel: HTMLElement,
    infoPanel: HTMLElement,
    processingContainer: HTMLElement
  ): void {
    panel.innerHTML = `
      <div class="flex items-center justify-between">
        <label class="text-sm font-medium leading-none">Video Clips (${clips.length})</label>
        <div>
          <input type="file" accept="video/*" multiple class="hidden" id="combine-add-clips" />
          <label for="combine-add-clips" class="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-transparent hover:bg-accent hover:text-accent-foreground h-9 px-3">
            ${iconSvg("Plus", 16, "w-4 h-4 mr-2")} Add Clips
          </label>
        </div>
      </div>
      <div id="combine-clips-list" class="space-y-2"></div>
    `

    if (clips.length < 2) {
      const hint = document.createElement("div")
      hint.className = "text-center py-8 text-sm text-muted-foreground"
      hint.innerHTML = "<p>Add at least 2 video clips to combine</p>"
      panel.appendChild(hint)
    }

    const fileInput = panel.querySelector("#combine-add-clips") as HTMLInputElement
    fileInput.addEventListener("change", () => {
      const files = Array.from(fileInput.files || [])
      clips = [...clips, ...files]
      fileInput.value = ""
      renderClipsList(panel, infoPanel, processingContainer)
    })

    const listEl = panel.querySelector("#combine-clips-list") as HTMLElement
    clips.forEach((clip, index) => {
      const clipEl = document.createElement("div")
      clipEl.className =
        "flex items-center gap-3 p-4 bg-background rounded-lg border border-border hover:border-accent/50 transition-colors"
      clipEl.innerHTML = `
        <span class="text-muted-foreground">${iconSvg("GripVertical", 16, "w-4 h-4")}</span>
        <div class="flex-1 min-w-0">
          <p class="font-medium truncate">${clip.name}</p>
          <p class="text-sm text-muted-foreground">${formatFileSize(clip.size)}</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm text-muted-foreground">#${index + 1}</span>
        </div>
      `

      if (clips.length > 1) {
        const removeBtn = document.createElement("button")
        removeBtn.className =
          "inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground h-9 w-9"
        removeBtn.innerHTML = iconSvg("X", 16, "w-4 h-4")
        removeBtn.addEventListener("click", () => {
          clips = clips.filter((_, i) => i !== index)
          renderClipsList(panel, infoPanel, processingContainer)
        })
        clipEl.querySelector(".flex.items-center.gap-2")!.appendChild(removeBtn)
      }

      listEl.appendChild(clipEl)
    })

    const totalSize = clips.reduce((sum, clip) => sum + clip.size, 0)
    infoPanel.innerHTML = `
      <p class="text-muted-foreground">
        Total clips: ${clips.length} | Total size: ${formatFileSize(totalSize)}
      </p>
      <p class="text-xs text-muted-foreground mt-2">
        Clips will be combined in the order shown above. Drag to reorder (coming soon).
      </p>
    `

    if (processingBtn) {
      processingBtn.destroy()
      const idx = activeChildren.indexOf(processingBtn)
      if (idx !== -1) activeChildren.splice(idx, 1)
    }
    processingContainer.innerHTML = ""
    processingBtn = null
    if (clips.length >= 2) {
      const getActionConfig = (): ActionConfig => ({
        type: "combine",
        params: { clips },
      })

      processingBtn = createProcessingButton({ config: getActionConfig() })
      activeChildren.push(processingBtn)
      processingContainer.appendChild(processingBtn.element)
    }
  }

  return {
    element: container,
    destroy: () => {
      activeChildren.forEach((c) => c.destroy())
      unsub?.()
    },
  }
}
