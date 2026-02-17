import type { Component, ActionConfig } from "../types"
import { getVideoData } from "../store"
import { createVideoUploadPrompt } from "../components/video-upload-prompt"
import { createBackButton } from "../components/back-button"
import { createProcessingButton } from "../components/processing-button"
import { iconSvg } from "../lib/icons"
import { createVideoUrl } from "../lib/video-url"
import { formatFileSize } from "../lib/file-utils"

/**
 * Overlay page for adding image watermarks/overlays to video.
 * Provides a video player with live overlay preview, position presets,
 * custom offset, scale, and opacity controls.
 */
export default function createOverlayPage(): Component {
  const container = document.createElement("div")
  container.className = "container mx-auto px-6 py-12 min-h-screen pt-20"

  let activeChildren: Component[] = []
  let videoUrl = ""
  let revokeVideoUrl: () => void = () => {}
  let overlayFile: File | null = null
  let overlayPreviewUrl = ""
  let processingBtn: Component | null = null
  let position = "top-left"
  let offsetX = 10
  let offsetY = 10
  let scalePct = 100
  let opacityPct = 100
  let isPlaying = false
  let videoBox = { width: 0, height: 0, offsetX: 0, offsetY: 0 }
  let resizeObserver: ResizeObserver | null = null

  if (!getVideoData()) {
    const prompt = createVideoUploadPrompt(() => {
      prompt.element.remove()
      renderPage()
    })
    activeChildren.push(prompt)
    container.appendChild(prompt.element)
  } else {
    renderPage()
  }

  function renderPage(): void {
    const videoData = getVideoData()
    if (!videoData) return

    activeChildren.forEach((c) => c.destroy())
    activeChildren = []
    container.innerHTML = ""

    const urlResult = createVideoUrl(videoData.file)
    videoUrl = urlResult.url
    revokeVideoUrl = urlResult.revoke

    const inner = document.createElement("div")
    inner.className = "max-w-6xl mx-auto space-y-6"

    const backBtn = createBackButton("/actions", "Back")
    activeChildren.push(backBtn)
    inner.appendChild(backBtn.element)

    const content = document.createElement("div")
    content.className = "space-y-4"

    // Video container with overlay preview
    const videoContainer = document.createElement("div")
    videoContainer.className = "relative aspect-video bg-black rounded-lg overflow-hidden"
    videoContainer.id = "overlay-video-container"

    const videoEl = document.createElement("video")
    videoEl.src = videoUrl
    videoEl.className = "w-full h-full object-contain"
    videoContainer.appendChild(videoEl)

    const overlayDiv = document.createElement("div")
    overlayDiv.className = "absolute pointer-events-none"
    overlayDiv.id = "overlay-preview-wrapper"
    overlayDiv.style.display = "none"
    videoContainer.appendChild(overlayDiv)

    content.appendChild(videoContainer)

    // Play/pause button
    const controlsDiv = document.createElement("div")
    controlsDiv.className = "flex items-center justify-center"
    const playBtn = document.createElement("button")
    playBtn.className =
      "inline-flex items-center justify-center rounded-full border border-input bg-transparent hover:bg-accent hover:text-accent-foreground w-12 h-12"
    playBtn.innerHTML = iconSvg("Play", 20, "w-5 h-5 ml-0.5")
    controlsDiv.appendChild(playBtn)
    content.appendChild(controlsDiv)

    // Settings panel
    const settingsPanel = document.createElement("div")
    settingsPanel.className = "bg-secondary/50 rounded-lg p-6 space-y-6"
    settingsPanel.innerHTML = `
      <div class="space-y-2">
        <h3 class="text-lg font-semibold">Add Overlay</h3>
        <p class="text-sm text-muted-foreground">Add an image overlay or watermark to your video</p>
      </div>
      <div class="space-y-6" id="overlay-controls"></div>
      <div class="bg-background/50 rounded p-4 text-sm">
        <p class="text-muted-foreground">Re-encoding required: overlays change video frames.</p>
      </div>
      <div id="overlay-processing"></div>
    `
    content.appendChild(settingsPanel)

    inner.appendChild(content)
    container.appendChild(inner)

    // Video events
    videoEl.addEventListener("play", () => {
      isPlaying = true
      playBtn.innerHTML = iconSvg("Pause", 20, "w-5 h-5")
    })
    videoEl.addEventListener("pause", () => {
      isPlaying = false
      playBtn.innerHTML = iconSvg("Play", 20, "w-5 h-5 ml-0.5")
    })
    playBtn.addEventListener("click", () => {
      if (isPlaying) videoEl.pause()
      else videoEl.play()
    })

    // Video box tracking for overlay positioning
    function updateVideoBox(): void {
      if (videoEl.videoWidth === 0 || videoEl.videoHeight === 0) return
      const { width: cw, height: ch } = videoContainer.getBoundingClientRect()
      const videoRatio = videoEl.videoWidth / videoEl.videoHeight
      const containerRatio = cw / ch

      let w = cw
      let h = ch
      if (containerRatio > videoRatio) {
        h = ch
        w = h * videoRatio
      } else {
        w = cw
        h = w / videoRatio
      }

      videoBox = {
        width: w,
        height: h,
        offsetX: (cw - w) / 2,
        offsetY: (ch - h) / 2,
      }
      updateOverlayPreview()
    }

    videoEl.addEventListener("loadedmetadata", updateVideoBox)
    videoEl.addEventListener("loadeddata", updateVideoBox)

    resizeObserver = new ResizeObserver(updateVideoBox)
    resizeObserver.observe(videoContainer)

    renderControls()

    function renderControls(): void {
      const controlsEl = settingsPanel.querySelector("#overlay-controls") as HTMLElement
      controlsEl.innerHTML = ""

      // Overlay image upload section
      const imageSection = document.createElement("div")
      imageSection.className = "space-y-2"
      imageSection.innerHTML = `<label class="text-sm font-medium leading-none">Overlay Image</label>`

      if (overlayFile) {
        const preview = document.createElement("div")
        preview.className = "bg-background rounded-lg p-4 border border-border"
        preview.innerHTML = `
          <div class="flex items-center gap-4">
            ${overlayPreviewUrl ? `<img src="${overlayPreviewUrl}" alt="Overlay" class="w-16 h-16 object-contain rounded" />` : ""}
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">${overlayFile.name}</p>
              <p class="text-sm text-muted-foreground mt-1">${formatFileSize(overlayFile.size)}</p>
            </div>
            <button id="overlay-remove-btn" class="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-transparent hover:bg-accent hover:text-accent-foreground h-9 px-3">
              Remove
            </button>
          </div>
        `
        imageSection.appendChild(preview)
        preview.querySelector("#overlay-remove-btn")!.addEventListener("click", () => {
          clearOverlayFile()
          renderControls()
        })
      } else {
        const uploadDiv = document.createElement("div")
        uploadDiv.innerHTML = `
          <input type="file" accept="image/*" class="hidden" id="overlay-file-input" />
          <label for="overlay-file-input" class="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-transparent hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full">
            ${iconSvg("Upload", 16, "w-4 h-4 mr-2")} Upload Overlay Image
          </label>
          <p class="text-xs text-muted-foreground mt-2">PNG recommended for transparency support</p>
        `
        imageSection.appendChild(uploadDiv)
        const fileInput = uploadDiv.querySelector("#overlay-file-input") as HTMLInputElement
        fileInput.addEventListener("change", () => {
          const file = fileInput.files?.[0]
          if (file) {
            setOverlayFile(file)
            renderControls()
          }
        })
      }
      controlsEl.appendChild(imageSection)

      // Position select
      const posSection = document.createElement("div")
      posSection.className = "space-y-2"
      posSection.innerHTML = `
        <label class="text-sm font-medium leading-none">Position</label>
        <select id="overlay-position" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
          <option value="top-left" ${position === "top-left" ? "selected" : ""}>Top Left</option>
          <option value="top-right" ${position === "top-right" ? "selected" : ""}>Top Right</option>
          <option value="bottom-left" ${position === "bottom-left" ? "selected" : ""}>Bottom Left</option>
          <option value="bottom-right" ${position === "bottom-right" ? "selected" : ""}>Bottom Right</option>
          <option value="center" ${position === "center" ? "selected" : ""}>Center</option>
        </select>
      `
      controlsEl.appendChild(posSection)
      const posSelect = posSection.querySelector("#overlay-position") as HTMLSelectElement
      posSelect.addEventListener("change", () => {
        position = posSelect.value
        renderControls()
        updateOverlayPreview()
      })

      // X/Y offset inputs (hidden when center)
      if (position !== "center") {
        const offsetSection = document.createElement("div")
        offsetSection.className = "grid md:grid-cols-2 gap-4"
        offsetSection.innerHTML = `
          <div class="space-y-2">
            <label class="text-sm font-medium leading-none">X Offset (pixels)</label>
            <input type="number" id="overlay-offset-x" value="${offsetX}" placeholder="10"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium leading-none">Y Offset (pixels)</label>
            <input type="number" id="overlay-offset-y" value="${offsetY}" placeholder="10"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
        `
        controlsEl.appendChild(offsetSection)

        const xInput = offsetSection.querySelector("#overlay-offset-x") as HTMLInputElement
        const yInput = offsetSection.querySelector("#overlay-offset-y") as HTMLInputElement
        xInput.addEventListener("input", () => {
          offsetX = parseInt(xInput.value) || 10
          updateOverlayPreview()
        })
        yInput.addEventListener("input", () => {
          offsetY = parseInt(yInput.value) || 10
          updateOverlayPreview()
        })
      }

      // Scale slider
      const scaleSection = document.createElement("div")
      scaleSection.className = "space-y-3"
      scaleSection.innerHTML = `
        <div class="flex justify-between">
          <label class="text-sm font-medium leading-none">Scale</label>
          <span class="text-sm text-muted-foreground" id="overlay-scale-label">${scalePct}%</span>
        </div>
        <input type="range" id="overlay-scale" min="10" max="100" step="5" value="${scalePct}"
          class="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[hsl(var(--accent))]" />
      `
      controlsEl.appendChild(scaleSection)
      const scaleInput = scaleSection.querySelector("#overlay-scale") as HTMLInputElement
      const scaleLabel = scaleSection.querySelector("#overlay-scale-label")!
      scaleInput.addEventListener("input", () => {
        scalePct = parseInt(scaleInput.value)
        scaleLabel.textContent = `${scalePct}%`
        updateOverlayPreview()
      })

      // Opacity slider
      const opacitySection = document.createElement("div")
      opacitySection.className = "space-y-3"
      opacitySection.innerHTML = `
        <div class="flex justify-between">
          <label class="text-sm font-medium leading-none">Opacity</label>
          <span class="text-sm text-muted-foreground" id="overlay-opacity-label">${opacityPct}%</span>
        </div>
        <input type="range" id="overlay-opacity" min="10" max="100" step="5" value="${opacityPct}"
          class="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[hsl(var(--accent))]" />
      `
      controlsEl.appendChild(opacitySection)
      const opacityInput = opacitySection.querySelector("#overlay-opacity") as HTMLInputElement
      const opacityLabel = opacitySection.querySelector("#overlay-opacity-label")!
      opacityInput.addEventListener("input", () => {
        opacityPct = parseInt(opacityInput.value)
        opacityLabel.textContent = `${opacityPct}%`
        updateOverlayPreview()
      })

      // Processing button
      const procContainer = settingsPanel.querySelector("#overlay-processing") as HTMLElement
      if (processingBtn) {
        processingBtn.destroy()
        const idx = activeChildren.indexOf(processingBtn)
        if (idx !== -1) activeChildren.splice(idx, 1)
      }
      procContainer.innerHTML = ""
      processingBtn = null
      if (overlayFile) {
        const getActionConfig = (): ActionConfig => ({
          type: "overlay",
          params: {
            overlayFile,
            position,
            offsetX,
            offsetY,
            scalePct,
            opacityPct,
          },
        })
        processingBtn = createProcessingButton({
          config: getActionConfig(),
          onReset: () => {
            clearOverlayFile()
            renderControls()
          },
        })
        activeChildren.push(processingBtn)
        procContainer.appendChild(processingBtn.element)
      }
    }

    function setOverlayFile(file: File): void {
      if (overlayPreviewUrl) URL.revokeObjectURL(overlayPreviewUrl)
      overlayFile = file
      overlayPreviewUrl = URL.createObjectURL(file)
      updateOverlayPreview()
    }

    function clearOverlayFile(): void {
      if (overlayPreviewUrl) URL.revokeObjectURL(overlayPreviewUrl)
      overlayFile = null
      overlayPreviewUrl = ""
      updateOverlayPreview()
    }

    function updateOverlayPreview(): void {
      const wrapper = container.querySelector("#overlay-preview-wrapper") as HTMLElement
      if (!wrapper) return

      if (!overlayPreviewUrl) {
        wrapper.style.display = "none"
        return
      }

      wrapper.style.display = "block"
      wrapper.style.top = `${videoBox.offsetY}px`
      wrapper.style.left = `${videoBox.offsetX}px`
      wrapper.style.width = `${videoBox.width}px`
      wrapper.style.height = `${videoBox.height}px`

      // Build overlay image
      wrapper.innerHTML = ""
      const img = document.createElement("img")
      img.src = overlayPreviewUrl
      img.alt = "Overlay preview"
      img.style.position = "absolute"
      img.style.maxWidth = `${scalePct}%`
      img.style.maxHeight = `${scalePct}%`
      img.style.opacity = String(opacityPct / 100)
      img.style.objectFit = "contain"

      switch (position) {
        case "top-right":
          img.style.top = `${offsetY}px`
          img.style.right = `${offsetX}px`
          break
        case "bottom-left":
          img.style.bottom = `${offsetY}px`
          img.style.left = `${offsetX}px`
          break
        case "bottom-right":
          img.style.bottom = `${offsetY}px`
          img.style.right = `${offsetX}px`
          break
        case "center":
          img.style.top = "50%"
          img.style.left = "50%"
          img.style.transform = "translate(-50%, -50%)"
          break
        default: // top-left
          img.style.top = `${offsetY}px`
          img.style.left = `${offsetX}px`
          break
      }

      wrapper.appendChild(img)
    }
  }

  return {
    element: container,
    destroy: () => {
      activeChildren.forEach((c) => c.destroy())
      revokeVideoUrl()
      if (overlayPreviewUrl) URL.revokeObjectURL(overlayPreviewUrl)
      resizeObserver?.disconnect()
    },
  }
}
