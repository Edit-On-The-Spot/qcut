import { snapTimeToFrame, calculateTimeFromMousePosition, timeToFrame } from "./time-utils"

export interface MarkerDragOptions {
  /** The video element for real-time preview during drag. */
  videoEl: HTMLVideoElement
  /** Framerate in fps for frame snapping. */
  framerate: number
  /** Total video duration in seconds. */
  duration: number
  /** Returns the current start time in seconds. */
  getStartTime: () => number
  /** Returns the current end time in seconds. */
  getEndTime: () => number
  /** Start of the visible time range in seconds. */
  visibleStart: number
  /** End of the visible time range in seconds. */
  visibleEnd: number
  /** Width of the drag container in pixels. */
  containerWidth: number
  /** Called when start time changes (time, frame). */
  onStartChange: (timeSec: number, frame: number) => void
  /** Called when end time changes (time, frame). */
  onEndChange: (timeSec: number, frame: number) => void
  /** Called when drag state changes. */
  onDragStateChange: (isDragging: boolean, markerType: "start" | "end" | null) => void
}

/**
 * Creates draggable marker handlers for start/end time markers on a timeline.
 * Supports frame snapping, auto-swap (if start dragged past end or vice versa),
 * and real-time video preview during drag.
 * Uses the Pointer Events API for unified mouse and touch support.
 * @param options - Configuration for marker dragging behavior
 * @returns Object with pointerdown handlers for start/end markers and cleanup
 */
export function createMarkerDrag(options: MarkerDragOptions): {
  handleStartMarkerPointerDown: (e: PointerEvent) => void
  handleEndMarkerPointerDown: (e: PointerEvent) => void
  destroy: () => void
} {
  let activeMoveHandler: ((e: PointerEvent) => void) | null = null
  let activeUpHandler: (() => void) | null = null

  /**
   * Updates the video element's currentTime for real-time preview during drag.
   */
  function updateVideoPreview(timeSec: number): void {
    if (options.videoEl && !isNaN(timeSec)) {
      options.videoEl.currentTime = timeSec
    }
  }

  /**
   * Cleans up any active document-level listeners from a previous drag.
   */
  function cleanupListeners(): void {
    if (activeMoveHandler) {
      document.removeEventListener("pointermove", activeMoveHandler)
      activeMoveHandler = null
    }
    if (activeUpHandler) {
      document.removeEventListener("pointerup", activeUpHandler)
      activeUpHandler = null
    }
  }

  /**
   * Handles pointerdown on the start marker. Initiates a drag session that
   * tracks pointer movement, snaps to frames, auto-swaps if dragged past end,
   * and provides real-time video preview. Works for both mouse and touch input.
   */
  function handleStartMarkerPointerDown(e: PointerEvent): void {
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)

    cleanupListeners()
    options.onDragStateChange(true, "start")

    const parentElement = (e.currentTarget as HTMLElement).parentElement
    if (!parentElement) return

    const handlePointerMove = (moveEvent: PointerEvent): void => {
      const rect = parentElement.getBoundingClientRect()
      const pointerX = moveEvent.clientX - rect.left
      const newTime = calculateTimeFromMousePosition(
        pointerX,
        options.containerWidth,
        options.visibleStart,
        options.visibleEnd
      )
      const snappedTime = snapTimeToFrame(newTime, options.framerate, options.duration)
      const frame = timeToFrame(snappedTime, options.framerate)

      const endTime = options.getEndTime()
      if (snappedTime > endTime) {
        const endFrame = timeToFrame(endTime, options.framerate)
        options.onEndChange(snappedTime, frame)
        options.onStartChange(endTime, endFrame)
      } else {
        options.onStartChange(snappedTime, frame)
      }

      updateVideoPreview(snappedTime)
    }

    const handlePointerUp = (): void => {
      options.onDragStateChange(false, null)
      cleanupListeners()
    }

    activeMoveHandler = handlePointerMove
    activeUpHandler = handlePointerUp
    document.addEventListener("pointermove", handlePointerMove)
    document.addEventListener("pointerup", handlePointerUp)
  }

  /**
   * Handles pointerdown on the end marker. Initiates a drag session that
   * tracks pointer movement, snaps to frames, auto-swaps if dragged before start,
   * and provides real-time video preview. Works for both mouse and touch input.
   */
  function handleEndMarkerPointerDown(e: PointerEvent): void {
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)

    cleanupListeners()
    options.onDragStateChange(true, "end")

    const parentElement = (e.currentTarget as HTMLElement).parentElement
    if (!parentElement) return

    const handlePointerMove = (moveEvent: PointerEvent): void => {
      const rect = parentElement.getBoundingClientRect()
      const pointerX = moveEvent.clientX - rect.left
      const newTime = calculateTimeFromMousePosition(
        pointerX,
        options.containerWidth,
        options.visibleStart,
        options.visibleEnd
      )
      const snappedTime = snapTimeToFrame(newTime, options.framerate, options.duration)
      const frame = timeToFrame(snappedTime, options.framerate)

      const startTime = options.getStartTime()
      if (snappedTime < startTime) {
        const startFrame = timeToFrame(startTime, options.framerate)
        options.onStartChange(snappedTime, frame)
        options.onEndChange(startTime, startFrame)
      } else {
        options.onEndChange(snappedTime, frame)
      }

      updateVideoPreview(snappedTime)
    }

    const handlePointerUp = (): void => {
      options.onDragStateChange(false, null)
      cleanupListeners()
    }

    activeMoveHandler = handlePointerMove
    activeUpHandler = handlePointerUp
    document.addEventListener("pointermove", handlePointerMove)
    document.addEventListener("pointerup", handlePointerUp)
  }

  return {
    handleStartMarkerPointerDown,
    handleEndMarkerPointerDown,
    /**
     * Removes any active document-level event listeners.
     */
    destroy(): void {
      cleanupListeners()
    },
  }
}
