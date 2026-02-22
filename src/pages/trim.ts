import type { Component, ActionConfig } from "../types"
import { getVideoData, subscribe } from "../store"
import { createVideoUploadPrompt } from "../components/video-upload-prompt"
import { createBackButton } from "../components/back-button"
import { createProcessingButton } from "../components/processing-button"
import { iconSvg } from "../lib/icons"
import { createVideoUrl } from "../lib/video-url"
import { createVideoFramerate } from "../lib/video-framerate"
import { createFFmpegThumbnails } from "../lib/ffmpeg-thumbnails"
import { createThumbnailZoom } from "../lib/thumbnail-zoom"
import { createMarkerDrag } from "../lib/marker-drag"
import { snapTimeToFrame, formatTime, formatTimeWithCentiseconds } from "../lib/time-utils"

/**
 * Trim page for cutting video segments with visual timeline preview.
 * Features a seekable scrubber timeline with draggable start/end markers,
 * a zoomable thumbnail strip, and keyboard navigation.
 */
export default function createTrimPage(): Component {
  const container = document.createElement("div")
  container.className = "container mx-auto px-6 py-12 min-h-screen pt-20"

  let activeChildren: Component[] = []
  let revokeUrl: () => void = () => {}
  let framerateHandle: { getFramerateFps: () => number; destroy: () => void } | null = null
  let thumbnailsHandle: ReturnType<typeof createFFmpegThumbnails> | null = null
  let zoomHandle: ReturnType<typeof createThumbnailZoom> | null = null
  let scrubberMarkerDrag: ReturnType<typeof createMarkerDrag> | null = null
  let thumbnailMarkerDrag: ReturnType<typeof createMarkerDrag> | null = null
  let resizeObserver: ResizeObserver | null = null
  let autoScrollInterval: ReturnType<typeof setInterval> | null = null
  let keydownHandler: ((e: KeyboardEvent) => void) | null = null
  let zoomUnsub: (() => void) | null = null
  let thumbnailStoreUnsub: (() => void) | null = null
  let processingBtn: Component | null = null

  // Mutable state
  let isPlaying = false
  let isMuted = false
  let currentTimeSec = 0
  let durationSec = 0
  let startTimeSec = 0
  let endTimeSec = 0
  let containerWidthPx = 0
  let isDragging = false
  let draggingMarkerType: "start" | "end" | null = null
  let isPanning = false
  let prevZoomLevel = 0
  let videoEl: HTMLVideoElement | null = null

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

  function getFramerate(): number {
    return framerateHandle ? framerateHandle.getFramerateFps() : 30
  }

  function snapTime(timeSec: number): number {
    return snapTimeToFrame(timeSec, getFramerate(), durationSec)
  }

  function getActionConfig(): ActionConfig {
    return {
      type: "trim",
      params: {
        start: snapTime(startTimeSec).toFixed(2),
        end: snapTime(endTimeSec).toFixed(2),
      },
    }
  }

  function handleClearSelection(): void {
    startTimeSec = 0
    endTimeSec = durationSec
    updateScrubberTimeline()
    updateThumbnailStrip()
    updateSelectionInfo()
    updateProcessingButton()
    updateMarkButtons()
  }

  function renderPage(): void {
    const videoData = getVideoData()
    if (!videoData) return

    activeChildren.forEach((c) => c.destroy())
    activeChildren = []
    container.innerHTML = ""

    const urlResult = createVideoUrl(videoData.file)
    revokeUrl = urlResult.revoke

    const inner = document.createElement("div")
    inner.className = "max-w-6xl mx-auto space-y-6"

    // Top bar
    const topBar = document.createElement("div")
    topBar.className = "flex items-center justify-between"
    const backBtn = createBackButton("/actions", "Back")
    activeChildren.push(backBtn)
    topBar.appendChild(backBtn.element)

    const clearBtn = document.createElement("button")
    clearBtn.className =
      "inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-transparent hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
    clearBtn.textContent = "Clear Selection"
    clearBtn.addEventListener("click", handleClearSelection)
    topBar.appendChild(clearBtn)
    inner.appendChild(topBar)

    const content = document.createElement("div")
    content.className = "space-y-4"

    // Video element
    const videoWrapper = document.createElement("div")
    videoWrapper.className = "relative aspect-video bg-black rounded-lg overflow-hidden"
    videoEl = document.createElement("video")
    videoEl.src = urlResult.url
    videoEl.className = "w-full h-full object-contain"
    videoEl.playsInline = true
    videoWrapper.appendChild(videoEl)
    content.appendChild(videoWrapper)

    // Controls row
    const controlsDiv = document.createElement("div")
    controlsDiv.className = "flex items-center justify-center gap-4"

    const playBtn = document.createElement("button")
    playBtn.className =
      "inline-flex items-center justify-center rounded-full border border-input bg-transparent hover:bg-accent hover:text-accent-foreground w-12 h-12"
    playBtn.innerHTML = iconSvg("Play", 20, "w-5 h-5 ml-0.5")
    playBtn.id = "trim-play-btn"
    controlsDiv.appendChild(playBtn)

    const muteBtn = document.createElement("button")
    muteBtn.className =
      "inline-flex items-center justify-center rounded-full border border-input bg-transparent hover:bg-accent hover:text-accent-foreground w-12 h-12"
    muteBtn.innerHTML = iconSvg("Volume2", 20, "w-5 h-5")
    muteBtn.id = "trim-mute-btn"
    controlsDiv.appendChild(muteBtn)

    const markStartBtn = document.createElement("button")
    markStartBtn.className =
      "inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-transparent hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 gap-2"
    markStartBtn.id = "trim-mark-start"
    markStartBtn.innerHTML = `${iconSvg("Scissors", 16, "w-4 h-4")} Mark Start`
    controlsDiv.appendChild(markStartBtn)

    const markEndBtn = document.createElement("button")
    markEndBtn.className =
      "inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-transparent hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 gap-2"
    markEndBtn.id = "trim-mark-end"
    markEndBtn.innerHTML = `${iconSvg("Scissors", 16, "w-4 h-4")} Mark End`
    controlsDiv.appendChild(markEndBtn)

    content.appendChild(controlsDiv)

    // Scrubber timeline
    const scrubberSection = document.createElement("div")
    scrubberSection.className = "space-y-2"
    scrubberSection.innerHTML = `
      <div id="trim-scrubber" class="relative h-1.5 bg-secondary rounded-full cursor-pointer group">
        <div id="trim-scrub-progress" class="absolute top-0 left-0 h-full bg-accent rounded-full transition-all z-0" style="width:0%"></div>
        <div id="trim-scrub-viewport" class="absolute top-0 h-full bg-blue-500/20 border border-blue-500 rounded-full pointer-events-none" style="display:none"></div>
        <div id="trim-scrub-selection" class="absolute top-0 h-full border-2 border-dashed border-yellow-400 opacity-50 rounded-full" style="left:0%;width:100%"></div>
        <div id="trim-scrub-playhead" class="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-accent rounded-full shadow-lg transition-all z-10" style="left:0%;margin-left:-0.5rem"></div>
        <div id="trim-scrub-start-marker" class="absolute top-1/2 -translate-y-1/2 w-4 h-6 bg-green-500 border-2 border-white rounded shadow-lg cursor-ew-resize hover:scale-110 transition-transform z-20" style="left:0%;margin-left:-0.5rem">
          <div class="absolute inset-0 flex items-center justify-center text-[8px] text-white font-bold">S</div>
        </div>
        <div id="trim-scrub-end-marker" class="absolute top-1/2 -translate-y-1/2 w-4 h-6 bg-red-500 border-2 border-white rounded shadow-lg cursor-ew-resize hover:scale-110 transition-transform z-20" style="left:100%;margin-left:-0.5rem">
          <div class="absolute inset-0 flex items-center justify-center text-[8px] text-white font-bold">E</div>
        </div>
      </div>
      <div class="flex justify-between text-sm text-muted-foreground">
        <span id="trim-current-time">0:00</span>
        <span id="trim-duration-time">0:00</span>
      </div>
    `
    content.appendChild(scrubberSection)

    // Thumbnail strip
    const thumbnailSection = document.createElement("div")
    thumbnailSection.className = "relative"
    thumbnailSection.innerHTML = `
      <div id="trim-thumb-container" class="flex gap-1 pb-2 cursor-grab"></div>
      <div id="trim-thumb-selection" class="absolute top-0 h-24 border-t-2 border-b-2 border-dashed border-yellow-400 bg-yellow-500/20 pointer-events-none" style="display:none"></div>
    `
    content.appendChild(thumbnailSection)

    // Selection info
    const selectionInfo = document.createElement("div")
    selectionInfo.id = "trim-selection-info"
    selectionInfo.style.display = "none"
    selectionInfo.className = "bg-secondary/50 rounded-lg p-4"
    content.appendChild(selectionInfo)

    // Processing button
    const processingContainer = document.createElement("div")
    processingContainer.id = "trim-processing"
    content.appendChild(processingContainer)

    inner.appendChild(content)
    container.appendChild(inner)

    // Set up framerate detection
    framerateHandle = createVideoFramerate(videoEl)

    // Set up thumbnails
    thumbnailsHandle = createFFmpegThumbnails(videoData)

    // Video events
    videoEl.addEventListener("loadedmetadata", () => {
      durationSec = videoEl!.duration
      if (endTimeSec === 0) endTimeSec = durationSec

      const durLabel = container.querySelector("#trim-duration-time")
      if (durLabel) durLabel.textContent = formatTime(durationSec)

      initZoomAndMarkers()
      updateScrubberTimeline()
      updateSelectionInfo()
      updateProcessingButton()
      updateMarkButtons()
    })

    videoEl.addEventListener("timeupdate", () => {
      currentTimeSec = videoEl!.currentTime
      updateScrubberTimeline()
    })

    videoEl.addEventListener("play", () => {
      isPlaying = true
      playBtn.innerHTML = iconSvg("Pause", 20, "w-5 h-5")
    })
    videoEl.addEventListener("pause", () => {
      isPlaying = false
      playBtn.innerHTML = iconSvg("Play", 20, "w-5 h-5 ml-0.5")
    })

    playBtn.addEventListener("click", () => {
      if (isPlaying) videoEl!.pause()
      else videoEl!.play()
    })

    muteBtn.addEventListener("click", () => {
      isMuted = !isMuted
      videoEl!.muted = isMuted
      muteBtn.innerHTML = isMuted
        ? iconSvg("VolumeX", 20, "w-5 h-5")
        : iconSvg("Volume2", 20, "w-5 h-5")
    })

    markStartBtn.addEventListener("click", () => {
      startTimeSec = snapTime(currentTimeSec)
      updateScrubberTimeline()
      updateThumbnailStrip()
      updateSelectionInfo()
      updateProcessingButton()
      updateMarkButtons()
    })

    markEndBtn.addEventListener("click", () => {
      endTimeSec = snapTime(currentTimeSec)
      updateScrubberTimeline()
      updateThumbnailStrip()
      updateSelectionInfo()
      updateProcessingButton()
      updateMarkButtons()
    })

    // Scrubber click to seek
    const scrubber = container.querySelector("#trim-scrubber") as HTMLElement
    scrubber.addEventListener("click", (e: MouseEvent) => {
      // Ignore clicks on markers
      const target = e.target as HTMLElement
      if (target.classList.contains("cursor-ew-resize") || target.closest(".cursor-ew-resize")) return

      const rect = scrubber.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percentage = x / rect.width
      const time = snapTime(percentage * durationSec)
      videoEl!.currentTime = time
      currentTimeSec = time
      updateScrubberTimeline()

      // Pan thumbnail strip if needed
      if (zoomHandle) {
        const zState = zoomHandle.getState()
        if (time < zState.visibleStartSec || time > zState.visibleStartSec + zState.visibleDurationSec) {
          zoomHandle.setZoomCenter(percentage)
          updateThumbnailStrip()
        }
      }
    })
  }

  /**
   * Initializes zoom controller, marker drag handlers, resize observer,
   * and keyboard navigation after the video metadata is loaded.
   */
  function initZoomAndMarkers(): void {
    const thumbContainer = container.querySelector("#trim-thumb-container") as HTMLElement
    if (!thumbContainer || !videoEl) return

    // Measure container width
    containerWidthPx = thumbContainer.offsetWidth

    resizeObserver = new ResizeObserver(() => {
      containerWidthPx = thumbContainer.offsetWidth
      // Recreate markers with new container width
      recreateMarkerDrags()
      updateThumbnailStrip()
    })
    resizeObserver.observe(thumbContainer)

    // Initialize zoom
    zoomHandle = createThumbnailZoom({
      durationSec,
      framerateFps: getFramerate(),
      containerWidthPx,
    })

    // Subscribe to zoom state changes to update thumbnails
    zoomUnsub = zoomHandle.subscribe(() => {
      const zState = zoomHandle!.getState()
      if (prevZoomLevel !== zState.zoomLevel) {
        thumbnailsHandle?.cancelPending()
        prevZoomLevel = zState.zoomLevel
      }
      updateThumbnailStrip()
      updateScrubberTimeline()
    })

    // Subscribe to thumbnail cache changes to re-render thumbnails
    thumbnailStoreUnsub = subscribe(() => {
      updateThumbnailStrip()
    })

    // Attach non-passive wheel listener
    const handleWheel = (e: WheelEvent): void => {
      zoomHandle!.handleWheel(e)
    }
    thumbContainer.addEventListener("wheel", handleWheel, { passive: false })

    // Thumbnail panning via pointer drag (mouse and touch)
    thumbContainer.addEventListener("pointerdown", (e: PointerEvent) => {
      const target = e.target as HTMLElement
      if (target.classList.contains("cursor-ew-resize") || target.closest(".cursor-ew-resize")) return

      e.preventDefault()
      thumbContainer.setPointerCapture(e.pointerId)
      isPanning = true
      thumbContainer.style.cursor = "grabbing"

      const startX = e.clientX
      const zState = zoomHandle!.getState()
      const startVisibleTime = zState.visibleStartSec
      const visDuration = zState.visibleDurationSec

      const handlePointerMove = (moveEvent: PointerEvent): void => {
        const deltaX = moveEvent.clientX - startX
        const deltaTime = (deltaX / containerWidthPx) * visDuration
        let newStart = startVisibleTime - deltaTime
        newStart = Math.max(0, Math.min(durationSec - visDuration, newStart))
        zoomHandle!.setVisibleRange(newStart, visDuration)
      }

      const handlePointerUp = (): void => {
        isPanning = false
        thumbContainer.style.cursor = "grab"
        document.removeEventListener("pointermove", handlePointerMove)
        document.removeEventListener("pointerup", handlePointerUp)
      }

      document.addEventListener("pointermove", handlePointerMove)
      document.addEventListener("pointerup", handlePointerUp)
    })

    // Create marker drags
    recreateMarkerDrags()

    // Auto-scroll during playback
    autoScrollInterval = setInterval(() => {
      if (!isPlaying || !zoomHandle) return
      const zState = zoomHandle.getState()
      if (currentTimeSec < zState.visibleStartSec || currentTimeSec > zState.visibleStartSec + zState.visibleDurationSec) {
        zoomHandle.setZoomCenter(currentTimeSec / durationSec)
      }
    }, 100)

    // Arrow key navigation
    keydownHandler = (e: KeyboardEvent) => {
      if (e.target !== document.body) return
      if (!zoomHandle) return

      const zState = zoomHandle.getState()
      const panAmount = zState.visibleDurationSec * 0.1

      if (e.key === "ArrowLeft") {
        e.preventDefault()
        const newStart = Math.max(0, zState.visibleStartSec - panAmount)
        zoomHandle.setVisibleRange(newStart, zState.visibleDurationSec)
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        const newStart = Math.min(durationSec - zState.visibleDurationSec, zState.visibleStartSec + panAmount)
        zoomHandle.setVisibleRange(newStart, zState.visibleDurationSec)
      }
    }
    window.addEventListener("keydown", keydownHandler)

    // Request initial thumbnails
    requestVisibleThumbnails()
    updateThumbnailStrip()
  }

  /**
   * Creates or recreates marker drag handlers for both the scrubber (full timeline)
   * and the thumbnail strip (zoomed range).
   */
  function recreateMarkerDrags(): void {
    scrubberMarkerDrag?.destroy()
    thumbnailMarkerDrag?.destroy()

    if (!videoEl) return

    const zState = zoomHandle ? zoomHandle.getState() : null
    const visibleEnd = zState
      ? zState.visibleStartSec + zState.visibleDurationSec
      : durationSec

    scrubberMarkerDrag = createMarkerDrag({
      videoEl,
      framerate: getFramerate(),
      duration: durationSec,
      getStartTime: () => startTimeSec,
      getEndTime: () => endTimeSec,
      visibleStart: 0,
      visibleEnd: durationSec,
      containerWidth: containerWidthPx,
      onStartChange: (time) => {
        startTimeSec = time
        updateScrubberTimeline()
        updateThumbnailStrip()
        updateSelectionInfo()
        updateProcessingButton()
        updateMarkButtons()
      },
      onEndChange: (time) => {
        endTimeSec = time
        updateScrubberTimeline()
        updateThumbnailStrip()
        updateSelectionInfo()
        updateProcessingButton()
        updateMarkButtons()
      },
      onDragStateChange: (dragging, markerType) => {
        isDragging = dragging
        draggingMarkerType = markerType
        updateMarkerVisuals()
      },
    })

    thumbnailMarkerDrag = createMarkerDrag({
      videoEl,
      framerate: getFramerate(),
      duration: durationSec,
      getStartTime: () => startTimeSec,
      getEndTime: () => endTimeSec,
      visibleStart: zState ? zState.visibleStartSec : 0,
      visibleEnd,
      containerWidth: containerWidthPx,
      onStartChange: (time) => {
        startTimeSec = time
        updateScrubberTimeline()
        updateThumbnailStrip()
        updateSelectionInfo()
        updateProcessingButton()
        updateMarkButtons()
      },
      onEndChange: (time) => {
        endTimeSec = time
        updateScrubberTimeline()
        updateThumbnailStrip()
        updateSelectionInfo()
        updateProcessingButton()
        updateMarkButtons()
      },
      onDragStateChange: (dragging, markerType) => {
        isDragging = dragging
        draggingMarkerType = markerType
        updateMarkerVisuals()
      },
    })

    // Attach scrubber marker handlers
    const scrubStartMarker = container.querySelector("#trim-scrub-start-marker") as HTMLElement
    const scrubEndMarker = container.querySelector("#trim-scrub-end-marker") as HTMLElement
    if (scrubStartMarker && scrubberMarkerDrag) {
      scrubStartMarker.onpointerdown = (e) => scrubberMarkerDrag!.handleStartMarkerPointerDown(e)
    }
    if (scrubEndMarker && scrubberMarkerDrag) {
      scrubEndMarker.onpointerdown = (e) => scrubberMarkerDrag!.handleEndMarkerPointerDown(e)
    }
  }

  function requestVisibleThumbnails(): void {
    if (!thumbnailsHandle || !zoomHandle) return
    const zState = zoomHandle.getState()
    if (thumbnailsHandle.isReady && zState.timestamps.length > 0) {
      thumbnailsHandle.requestThumbnails(zState.timestamps)
    }
  }

  function updateScrubberTimeline(): void {
    if (durationSec <= 0) return
    const pct = (currentTimeSec / durationSec) * 100

    const progress = container.querySelector("#trim-scrub-progress") as HTMLElement
    const playhead = container.querySelector("#trim-scrub-playhead") as HTMLElement
    const currentLabel = container.querySelector("#trim-current-time") as HTMLElement

    if (progress) progress.style.width = `${pct}%`
    if (playhead) playhead.style.left = `${pct}%`
    if (currentLabel) currentLabel.textContent = formatTime(currentTimeSec)

    // Viewport indicator
    const viewport = container.querySelector("#trim-scrub-viewport") as HTMLElement
    if (viewport && zoomHandle) {
      const zState = zoomHandle.getState()
      if (zState.zoomLevel > 0.01 && zState.visibleDurationSec < durationSec) {
        viewport.style.display = "block"
        viewport.style.left = `${Math.max(0, Math.min(100, (zState.visibleStartSec / durationSec) * 100))}%`
        viewport.style.width = `${Math.max(0, Math.min(100, (zState.visibleDurationSec / durationSec) * 100))}%`
      } else {
        viewport.style.display = "none"
      }
    }

    // Selection overlay
    const selection = container.querySelector("#trim-scrub-selection") as HTMLElement
    if (selection) {
      const startPct = (startTimeSec / durationSec) * 100
      const endPct = (endTimeSec / durationSec) * 100
      selection.style.left = `${Math.min(startPct, endPct)}%`
      selection.style.width = `${Math.abs(endPct - startPct)}%`
    }

    // Start/End markers
    const startMarker = container.querySelector("#trim-scrub-start-marker") as HTMLElement
    const endMarker = container.querySelector("#trim-scrub-end-marker") as HTMLElement
    if (startMarker) {
      startMarker.style.left = `${(startTimeSec / durationSec) * 100}%`
      startMarker.title = `Start: ${formatTime(startTimeSec)}`
    }
    if (endMarker) {
      endMarker.style.left = `${(endTimeSec / durationSec) * 100}%`
      endMarker.title = `End: ${formatTime(endTimeSec)}`
    }

    updateMarkerVisuals()
  }

  function updateMarkerVisuals(): void {
    const scrubStart = container.querySelector("#trim-scrub-start-marker") as HTMLElement
    const scrubEnd = container.querySelector("#trim-scrub-end-marker") as HTMLElement
    if (scrubStart) {
      scrubStart.className = `absolute top-1/2 -translate-y-1/2 w-4 h-6 bg-green-500 border-2 border-white rounded shadow-lg cursor-ew-resize hover:scale-110 transition-transform z-20 ${isDragging && draggingMarkerType === "start" ? "scale-125" : ""}`
    }
    if (scrubEnd) {
      scrubEnd.className = `absolute top-1/2 -translate-y-1/2 w-4 h-6 bg-red-500 border-2 border-white rounded shadow-lg cursor-ew-resize hover:scale-110 transition-transform z-20 ${isDragging && draggingMarkerType === "end" ? "scale-125" : ""}`
    }
  }

  function updateThumbnailStrip(): void {
    if (!zoomHandle || !thumbnailsHandle) return

    const zState = zoomHandle.getState()
    const thumbnailMap = thumbnailsHandle.getThumbnails(zState.timestamps)

    // Request thumbnails for any that are not yet cached
    if (thumbnailsHandle.isReady && zState.timestamps.length > 0) {
      thumbnailsHandle.requestThumbnails(zState.timestamps)
    }

    const thumbContainer = container.querySelector("#trim-thumb-container") as HTMLElement
    if (!thumbContainer) return

    // Rebuild thumbnails
    thumbContainer.innerHTML = ""

    for (const timestamp of zState.timestamps) {
      const thumb = thumbnailMap.get(timestamp)
      const thumbDiv = document.createElement("div")
      thumbDiv.className = "relative flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"

      if (!thumb) {
        thumbDiv.innerHTML = `
          <div class="w-40 h-24 bg-secondary rounded border-2 border-border flex items-center justify-center">
            ${iconSvg("Loader2", 24, "w-6 h-6 animate-spin text-muted-foreground")}
          </div>
          <span class="absolute bottom-1 left-1 px-1 py-0.5 text-xs bg-black/70 text-white rounded">${formatTimeWithCentiseconds(timestamp)}</span>
        `
      } else {
        thumbDiv.innerHTML = `
          <img src="${thumb}" alt="Frame at ${formatTime(timestamp)}" class="w-40 h-24 object-cover rounded border-2 border-border" />
          <span class="absolute bottom-1 left-1 px-1 py-0.5 text-xs bg-black/70 text-white rounded">${formatTimeWithCentiseconds(timestamp)}</span>
        `
      }

      thumbDiv.addEventListener("click", (e) => {
        // Don't seek when clicking markers
        const target = e.target as HTMLElement
        if (target.classList.contains("cursor-ew-resize") || target.closest(".cursor-ew-resize")) return
        if (videoEl) {
          const time = snapTime(timestamp)
          videoEl.currentTime = time
          currentTimeSec = time
          updateScrubberTimeline()
        }
      })

      thumbContainer.appendChild(thumbDiv)
    }

    // Thumbnail selection overlay
    const thumbSelection = container.querySelector("#trim-thumb-selection") as HTMLElement
    if (thumbSelection) {
      const visDuration = zState.visibleDurationSec > 0 ? zState.visibleDurationSec : durationSec
      if (visDuration <= 0 || zState.timestamps.length === 0) {
        thumbSelection.style.display = "none"
      } else {
        const relStart = Math.max(0, (startTimeSec - zState.visibleStartSec) / visDuration)
        const relEnd = Math.min(1, (endTimeSec - zState.visibleStartSec) / visDuration)

        if (relEnd <= 0 || relStart >= 1) {
          thumbSelection.style.display = "none"
        } else {
          thumbSelection.style.display = "block"
          thumbSelection.style.left = `${Math.max(0, Math.min(relStart, relEnd)) * 100}%`
          thumbSelection.style.width = `${Math.abs(relEnd - relStart) * 100}%`
        }
      }
    }

    // Thumbnail strip markers
    const thumbSection = container.querySelector("#trim-thumb-container")?.parentElement
    if (!thumbSection) return

    // Remove old thumbnail markers
    thumbSection.querySelectorAll("[data-thumb-marker]").forEach((el) => el.remove())

    const visDuration = zState.visibleDurationSec || durationSec
    const visEnd = zState.visibleStartSec + zState.visibleDurationSec

    // Start marker on thumbnail strip
    if (durationSec > 0 && startTimeSec >= zState.visibleStartSec && startTimeSec <= visEnd) {
      const marker = document.createElement("div")
      marker.setAttribute("data-thumb-marker", "start")
      marker.className = `absolute top-0 w-4 h-24 bg-green-500 border-2 border-white shadow-lg cursor-ew-resize hover:scale-110 transition-transform z-30 ${isDragging && draggingMarkerType === "start" ? "scale-125" : ""}`
      marker.style.left = `${((startTimeSec - zState.visibleStartSec) / visDuration) * 100}%`
      marker.style.marginLeft = "-0.5rem"
      marker.title = `Start: ${formatTime(startTimeSec)}`
      marker.innerHTML = `<div class="absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold">S</div>`
      marker.addEventListener("pointerdown", (e) => {
        thumbnailMarkerDrag?.handleStartMarkerPointerDown(e)
      })
      thumbSection.appendChild(marker)
    }

    // End marker on thumbnail strip
    if (durationSec > 0 && endTimeSec >= zState.visibleStartSec && endTimeSec <= visEnd) {
      const marker = document.createElement("div")
      marker.setAttribute("data-thumb-marker", "end")
      marker.className = `absolute top-0 w-4 h-24 bg-red-500 border-2 border-white shadow-lg cursor-ew-resize hover:scale-110 transition-transform z-30 ${isDragging && draggingMarkerType === "end" ? "scale-125" : ""}`
      marker.style.left = `${((endTimeSec - zState.visibleStartSec) / visDuration) * 100}%`
      marker.style.marginLeft = "-0.5rem"
      marker.title = `End: ${formatTime(endTimeSec)}`
      marker.innerHTML = `<div class="absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold">E</div>`
      marker.addEventListener("pointerdown", (e) => {
        thumbnailMarkerDrag?.handleEndMarkerPointerDown(e)
      })
      thumbSection.appendChild(marker)
    }
  }

  function updateSelectionInfo(): void {
    const infoEl = container.querySelector("#trim-selection-info") as HTMLElement
    if (!infoEl) return

    if (durationSec > 0) {
      infoEl.style.display = "block"
      infoEl.innerHTML = `
        <div class="text-sm space-y-1">
          <p class="text-muted-foreground">Selection:</p>
          <div class="flex gap-4">
            <span>Start: ${formatTime(startTimeSec)}</span>
            <span>End: ${formatTime(endTimeSec)}</span>
            <span>Duration: ${formatTime(Math.abs(endTimeSec - startTimeSec))}</span>
          </div>
          ${startTimeSec === endTimeSec ? '<p class="text-yellow-600 text-xs mt-2">Warning: Single frame selected</p>' : ""}
        </div>
      `
    } else {
      infoEl.style.display = "none"
    }
  }

  function updateMarkButtons(): void {
    const markStartBtn = container.querySelector("#trim-mark-start") as HTMLElement
    const markEndBtn = container.querySelector("#trim-mark-end") as HTMLElement
    const isDefault = startTimeSec === 0 && endTimeSec === durationSec

    if (markStartBtn) {
      markStartBtn.innerHTML = `${iconSvg("Scissors", 16, "w-4 h-4")} ${isDefault ? "Mark Start" : "Update Start"}`
    }
    if (markEndBtn) {
      markEndBtn.innerHTML = `${iconSvg("Scissors", 16, "w-4 h-4")} ${isDefault ? "Mark End" : "Update End"}`
    }
  }

  function updateProcessingButton(): void {
    const procContainer = container.querySelector("#trim-processing") as HTMLElement
    if (!procContainer) return

    if (processingBtn) {
      processingBtn.destroy()
      const idx = activeChildren.indexOf(processingBtn)
      if (idx !== -1) activeChildren.splice(idx, 1)
    }
    procContainer.innerHTML = ""

    if (durationSec > 0) {
      processingBtn = createProcessingButton({
        config: getActionConfig(),
        onReset: handleClearSelection,
      })
      activeChildren.push(processingBtn)
      procContainer.appendChild(processingBtn.element)
    } else {
      processingBtn = null
    }
  }

  return {
    element: container,
    destroy: () => {
      activeChildren.forEach((c) => c.destroy())
      revokeUrl()
      framerateHandle?.destroy()
      thumbnailsHandle?.destroy()
      zoomHandle?.destroy()
      scrubberMarkerDrag?.destroy()
      thumbnailMarkerDrag?.destroy()
      resizeObserver?.disconnect()
      zoomUnsub?.()
      thumbnailStoreUnsub?.()
      if (autoScrollInterval) clearInterval(autoScrollInterval)
      if (keydownHandler) window.removeEventListener("keydown", keydownHandler)
      if (videoEl) {
        videoEl.pause()
        videoEl.src = ""
      }
    },
  }
}
