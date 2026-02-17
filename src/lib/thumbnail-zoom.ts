const THUMBNAIL_WIDTH_PX = 160
const THUMBNAIL_GAP_PX = 4

/**
 * Zoom step multiplier for consistent zoom behavior.
 * Each zoom step changes the visible duration by this factor.
 * Values < 1 mean zooming in reduces the visible range to this fraction.
 */
const ZOOM_STEP_MULTIPLIER = 0.85

interface ThumbnailZoomConfig {
  durationSec: number
  framerateFps: number
  containerWidthPx: number
}

interface ThumbnailZoomState {
  zoomLevel: number
  visibleStartSec: number
  visibleDurationSec: number
  timestamps: number[]
}

/**
 * Calculates how many thumbnails fit in a container.
 * @param containerWidthPx - Width of the container in pixels
 * @returns Number of thumbnails that fit
 */
function calculateThumbnailCount(containerWidthPx: number): number {
  if (containerWidthPx <= 0) return 10
  const effectiveWidth = containerWidthPx + THUMBNAIL_GAP_PX
  const count = Math.floor(effectiveWidth / (THUMBNAIL_WIDTH_PX + THUMBNAIL_GAP_PX))
  return Math.max(1, count)
}

/**
 * Converts mouse X position to a timestamp within the visible range.
 * @param mouseXPx - Mouse X position relative to container
 * @param containerWidthPx - Width of the container in pixels
 * @param visibleStartSec - Start of visible range in seconds
 * @param visibleDurationSec - Duration of visible range in seconds
 * @returns Timestamp in seconds at the mouse position
 */
function mouseXToTimestampSec(
  mouseXPx: number,
  containerWidthPx: number,
  visibleStartSec: number,
  visibleDurationSec: number
): number {
  if (containerWidthPx <= 0) return visibleStartSec + visibleDurationSec / 2
  const percent = Math.max(0, Math.min(1, mouseXPx / containerWidthPx))
  return visibleStartSec + percent * visibleDurationSec
}

/**
 * Creates a thumbnail zoom controller that manages zoom level, visible range,
 * thumbnail count, and timestamp calculations for a thumbnail strip.
 * Supports mouse wheel zoom with position-aware centering (zoom step multiplier 0.85),
 * panning, and external control of visible range.
 * @param config - Configuration for zoom calculations
 * @returns Object with state getter, event handlers, and cleanup
 */
export function createThumbnailZoom(config: ThumbnailZoomConfig): {
  getState: () => ThumbnailZoomState
  handleWheel: (event: WheelEvent) => void
  setZoomCenter: (percent: number) => void
  setVisibleRange: (startSec: number, durationSec: number) => void
  subscribe: (fn: () => void) => () => void
  destroy: () => void
} {
  let { durationSec, framerateFps, containerWidthPx } = config

  let visibleStartSec = 0
  let visibleDurationSec = durationSec
  let hasZoomed = false

  const listeners = new Set<() => void>()

  function notify(): void {
    listeners.forEach((fn) => fn())
  }

  function getThumbnailCount(): number {
    return calculateThumbnailCount(containerWidthPx)
  }

  function getMaxDurationSec(): number {
    return durationSec
  }

  function getMinDurationSec(): number {
    return getThumbnailCount() / (framerateFps > 0 ? framerateFps : 30)
  }

  function getClampedVisibleDurationSec(): number {
    if (durationSec <= 0) return 0
    if (!hasZoomed) return durationSec
    if (visibleDurationSec > durationSec) return durationSec
    return Math.max(getMinDurationSec(), Math.min(getMaxDurationSec(), visibleDurationSec))
  }

  function getClampedVisibleStartSec(): number {
    if (durationSec <= 0) return 0
    const clampedDuration = getClampedVisibleDurationSec()
    if (clampedDuration >= durationSec) return 0
    let start = visibleStartSec
    start = Math.max(0, start)
    start = Math.min(durationSec - clampedDuration, start)
    return start
  }

  function getIntervalSec(): number {
    const count = getThumbnailCount()
    const clampedDuration = getClampedVisibleDurationSec()
    return count > 1 ? clampedDuration / (count - 1) : clampedDuration
  }

  function getZoomLevel(): number {
    if (durationSec <= 0 || durationSec <= getMinDurationSec()) return 0
    const ratio = (durationSec - getClampedVisibleDurationSec()) / (durationSec - getMinDurationSec())
    return Math.max(0, Math.min(1, ratio))
  }

  function getTimestamps(): number[] {
    if (durationSec <= 0) return []
    const count = getThumbnailCount()
    const interval = getIntervalSec()
    const start = getClampedVisibleStartSec()
    const result: number[] = []
    for (let i = 0; i < count; i++) {
      const ts = start + i * interval
      if (ts <= durationSec) {
        result.push(ts)
      }
    }
    return result
  }

  return {
    /**
     * Returns the current zoom state including zoom level, visible range, and timestamps.
     */
    getState(): ThumbnailZoomState {
      return {
        zoomLevel: getZoomLevel(),
        visibleStartSec: getClampedVisibleStartSec(),
        visibleDurationSec: getClampedVisibleDurationSec(),
        timestamps: getTimestamps(),
      }
    },

    /**
     * Handles wheel events to zoom in/out with mouse-position-aware centering.
     * Scroll up = zoom in, scroll down = zoom out.
     */
    handleWheel(event: WheelEvent): void {
      event.preventDefault()

      hasZoomed = true

      const target = event.currentTarget as HTMLElement
      const rect = target.getBoundingClientRect()
      const mouseXPx = event.clientX - rect.left

      const isZoomingIn = event.deltaY < 0
      const minDur = getMinDurationSec()
      const maxDur = getMaxDurationSec()

      const effectivePrevDuration =
        visibleDurationSec <= 0 || visibleDurationSec > maxDur ? maxDur : visibleDurationSec
      const currentDuration = Math.max(minDur, Math.min(maxDur, effectivePrevDuration))
      const currentStart = Math.max(0, Math.min(durationSec - currentDuration, visibleStartSec))

      const mouseTimestampSec = mouseXToTimestampSec(mouseXPx, containerWidthPx, currentStart, currentDuration)

      const newDuration = isZoomingIn
        ? currentDuration * ZOOM_STEP_MULTIPLIER
        : currentDuration / ZOOM_STEP_MULTIPLIER
      const clampedNewDuration = Math.max(minDur, Math.min(maxDur, newDuration))

      const mousePercent = containerWidthPx > 0 ? mouseXPx / containerWidthPx : 0.5
      const newStart = mouseTimestampSec - mousePercent * clampedNewDuration

      visibleDurationSec = clampedNewDuration
      visibleStartSec = Math.max(0, Math.min(durationSec - clampedNewDuration, newStart))

      notify()
    },

    /**
     * Sets the center point for zooming as a percentage of video duration.
     * @param percent - Percentage (0-1) of video duration to center on
     */
    setZoomCenter(percent: number): void {
      const clampedPercent = Math.max(0, Math.min(1, percent))
      const centerTimeSec = clampedPercent * durationSec
      const clampedDuration = getClampedVisibleDurationSec()
      const newStart = centerTimeSec - clampedDuration / 2
      visibleStartSec = Math.max(0, Math.min(durationSec - clampedDuration, newStart))
      notify()
    },

    /**
     * Sets the visible range directly for external control (e.g., panning).
     * @param startSec - Start time in seconds
     * @param durSec - Duration in seconds
     */
    setVisibleRange(startSec: number, durSec: number): void {
      hasZoomed = true
      visibleStartSec = startSec
      visibleDurationSec = durSec
      notify()
    },

    /**
     * Subscribes to zoom state changes. Returns an unsubscribe function.
     */
    subscribe(fn: () => void): () => void {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },

    /**
     * Cleans up all subscriptions.
     */
    destroy(): void {
      listeners.clear()
    },
  }
}
