"use client"

import { useState, useCallback, useMemo, useRef } from "react"

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

interface ThumbnailZoomResult {
  /** Current zoom level from 0 (zoomed out) to 1 (zoomed in) */
  zoomLevel: number
  /** Start time of visible range in seconds */
  visibleStartSec: number
  /** Duration of visible range in seconds */
  visibleDurationSec: number
  /** Interval between thumbnails in seconds */
  intervalSec: number
  /** Number of thumbnails that fit in the container */
  thumbnailCount: number
  /** Array of timestamps for visible thumbnails */
  timestamps: number[]
  /** Handle wheel event to zoom in/out (native event for non-passive listener) */
  handleWheel: (event: WheelEvent) => void
  /** Set the center point for zooming (as percentage of video duration) */
  setZoomCenter: (percent: number) => void
  /** Set the visible range directly for external control (e.g., panning, scrubber clicks) */
  setVisibleRange: (startSec: number, durationSec: number) => void
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
 * Used to determine where the user is pointing when zooming.
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
 * Hook to manage thumbnail zoom level and calculate visible timestamps.
 * Handles mouse wheel zoom with position-aware centering and consistent
 * multiplicative zoom steps. The zoom centers on the mouse position,
 * so pointing at the right side of the strip zooms toward the end.
 * @param config - Configuration for zoom calculations
 * @returns Zoom state and control functions
 */
export function useThumbnailZoom(config: ThumbnailZoomConfig): ThumbnailZoomResult {
  const { durationSec, framerateFps, containerWidthPx } = config

  // Track visible start directly for more predictable zoom behavior
  const [visibleStartSec, setVisibleStartSec] = useState(0)
  const [visibleDurationSec, setVisibleDurationSec] = useState(durationSec)

  // Track if user has manually zoomed (to distinguish from initial state)
  const hasZoomedRef = useRef(false)

  const thumbnailCount = useMemo(
    () => calculateThumbnailCount(containerWidthPx),
    [containerWidthPx]
  )

  // Max duration: full video
  const maxDurationSec = useMemo(
    () => durationSec,
    [durationSec]
  )

  // Min duration: one frame per thumbnail (most zoomed in)
  const minDurationSec = useMemo(
    () => thumbnailCount / framerateFps,
    [thumbnailCount, framerateFps]
  )

  // Clamp visible duration to valid range and sync with durationSec changes
  const clampedVisibleDurationSec = useMemo(() => {
    if (durationSec <= 0) return 0

    // If user hasn't zoomed yet, always show full video duration
    // This handles the case where durationSec changes from 0 to actual value
    if (!hasZoomedRef.current) {
      return durationSec
    }

    // If visible duration exceeds video duration, clamp to video duration
    if (visibleDurationSec > durationSec) {
      return durationSec
    }

    return Math.max(minDurationSec, Math.min(maxDurationSec, visibleDurationSec))
  }, [durationSec, visibleDurationSec, minDurationSec, maxDurationSec])

  // Clamp visible start to valid range
  const clampedVisibleStartSec = useMemo(() => {
    if (durationSec <= 0) return 0

    // If we're at full zoom out, start from 0
    if (clampedVisibleDurationSec >= durationSec) return 0

    let start = visibleStartSec
    start = Math.max(0, start)
    start = Math.min(durationSec - clampedVisibleDurationSec, start)
    return start
  }, [durationSec, visibleStartSec, clampedVisibleDurationSec])

  // Calculate interval from visible duration using fence-post logic:
  // N thumbnails have N-1 gaps between them, so last thumbnail shows the end frame
  const intervalSec = useMemo(
    () => (thumbnailCount > 1 ? clampedVisibleDurationSec / (thumbnailCount - 1) : clampedVisibleDurationSec),
    [clampedVisibleDurationSec, thumbnailCount]
  )

  // Calculate zoom level for display (0 = zoomed out, 1 = zoomed in)
  const zoomLevel = useMemo(() => {
    if (durationSec <= 0 || durationSec <= minDurationSec) return 0
    // Linear interpolation between max and min duration
    const ratio = (durationSec - clampedVisibleDurationSec) / (durationSec - minDurationSec)
    return Math.max(0, Math.min(1, ratio))
  }, [durationSec, clampedVisibleDurationSec, minDurationSec])

  // Generate timestamps for visible thumbnails
  const timestamps = useMemo(() => {
    if (durationSec <= 0) return []

    const result: number[] = []
    for (let i = 0; i < thumbnailCount; i++) {
      const ts = clampedVisibleStartSec + i * intervalSec
      if (ts <= durationSec) {
        result.push(ts)
      }
    }
    return result
  }, [durationSec, thumbnailCount, clampedVisibleStartSec, intervalSec])

  /**
   * Handles wheel events to zoom in/out with mouse-position-aware centering.
   * Zooming in reduces the visible range by a consistent multiplier,
   * centering on the timestamp under the mouse cursor.
   */
  const handleWheel = useCallback((event: WheelEvent) => {
    event.preventDefault()

    // Mark that user has started zooming, so we use their zoom state instead of auto-syncing
    hasZoomedRef.current = true

    // Get mouse position relative to container
    const target = event.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    const mouseXPx = event.clientX - rect.left

    // Determine zoom direction: scroll down = zoom out, scroll up = zoom in
    const isZoomingIn = event.deltaY < 0

    setVisibleDurationSec(prevDuration => {
      // Use max duration if previous duration was invalid (e.g., initialized to 0)
      // This ensures first zoom starts from full video, not from 0
      const effectivePrevDuration = prevDuration <= 0 || prevDuration > maxDurationSec
        ? maxDurationSec
        : prevDuration

      // Calculate current visible duration, clamped to valid range
      const currentDuration = Math.max(minDurationSec, Math.min(maxDurationSec, effectivePrevDuration))

      // Calculate new duration with consistent multiplicative step
      const newDuration = isZoomingIn
        ? currentDuration * ZOOM_STEP_MULTIPLIER
        : currentDuration / ZOOM_STEP_MULTIPLIER

      // Clamp to valid range
      return Math.max(minDurationSec, Math.min(maxDurationSec, newDuration))
    })

    setVisibleStartSec(prevStart => {
      // Use max duration if visible duration was invalid (e.g., initialized to 0)
      const effectiveVisibleDuration = visibleDurationSec <= 0 || visibleDurationSec > maxDurationSec
        ? maxDurationSec
        : visibleDurationSec

      // Get current state for calculations
      const currentDuration = Math.max(minDurationSec, Math.min(maxDurationSec, effectiveVisibleDuration))
      const currentStart = Math.max(0, Math.min(durationSec - currentDuration, prevStart))

      // Calculate the timestamp under the mouse cursor
      const mouseTimestampSec = mouseXToTimestampSec(
        mouseXPx,
        containerWidthPx,
        currentStart,
        currentDuration
      )

      // Calculate new duration
      const newDuration = isZoomingIn
        ? currentDuration * ZOOM_STEP_MULTIPLIER
        : currentDuration / ZOOM_STEP_MULTIPLIER
      const clampedNewDuration = Math.max(minDurationSec, Math.min(maxDurationSec, newDuration))

      // Calculate where the mouse should stay in the new view
      // Keep the timestamp under the mouse at the same relative position
      const mousePercent = containerWidthPx > 0 ? mouseXPx / containerWidthPx : 0.5
      const newStart = mouseTimestampSec - mousePercent * clampedNewDuration

      // Clamp to valid range
      return Math.max(0, Math.min(durationSec - clampedNewDuration, newStart))
    })
  }, [containerWidthPx, durationSec, minDurationSec, maxDurationSec, visibleDurationSec])

  /**
   * Sets the center point for zooming as a percentage of video duration.
   * @param percent - Percentage (0-1) of video duration to center on
   */
  const setZoomCenter = useCallback((percent: number) => {
    const clampedPercent = Math.max(0, Math.min(1, percent))
    const centerTimeSec = clampedPercent * durationSec
    const newStart = centerTimeSec - clampedVisibleDurationSec / 2
    setVisibleStartSec(Math.max(0, Math.min(durationSec - clampedVisibleDurationSec, newStart)))
  }, [durationSec, clampedVisibleDurationSec])

  /**
   * Sets the visible range directly for external control (e.g., panning, scrubber clicks).
   * @param startSec - Start time in seconds
   * @param durationSec - Duration in seconds
   */
  const setVisibleRange = useCallback((startSec: number, durationSec: number) => {
    hasZoomedRef.current = true
    setVisibleStartSec(startSec)
    setVisibleDurationSec(durationSec)
  }, [])

  return {
    zoomLevel,
    visibleStartSec: clampedVisibleStartSec,
    visibleDurationSec: clampedVisibleDurationSec,
    intervalSec,
    thumbnailCount,
    timestamps,
    handleWheel,
    setZoomCenter,
    setVisibleRange
  }
}
