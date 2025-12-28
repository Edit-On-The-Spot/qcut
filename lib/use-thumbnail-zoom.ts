"use client"

import { useState, useCallback, useMemo } from "react"

const THUMBNAIL_WIDTH_PX = 160
const THUMBNAIL_GAP_PX = 4

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
 * Calculates the interval between thumbnails based on zoom level.
 * Uses exponential interpolation for smoother zoom feel.
 * @param zoomLevel - Zoom level from 0 (out) to 1 (in)
 * @param maxIntervalSec - Interval when fully zoomed out
 * @param minIntervalSec - Interval when fully zoomed in (1 frame)
 * @returns Interval in seconds
 */
function calculateIntervalSec(
  zoomLevel: number,
  maxIntervalSec: number,
  minIntervalSec: number
): number {
  // Exponential interpolation for natural zoom feel
  const t = Math.pow(zoomLevel, 2)
  return maxIntervalSec - t * (maxIntervalSec - minIntervalSec)
}

/**
 * Hook to manage thumbnail zoom level and calculate visible timestamps.
 * Handles mouse wheel zoom and calculates timestamps based on container size,
 * video duration, and framerate.
 * @param config - Configuration for zoom calculations
 * @returns Zoom state and control functions
 */
export function useThumbnailZoom(config: ThumbnailZoomConfig): ThumbnailZoomResult {
  const { durationSec, framerateFps, containerWidthPx } = config

  const [zoomLevel, setZoomLevel] = useState(0)
  const [zoomCenterPercent, setZoomCenterPercent] = useState(0.5)

  const thumbnailCount = useMemo(
    () => calculateThumbnailCount(containerWidthPx),
    [containerWidthPx]
  )

  // Max interval: one thumbnail per (duration / count) - covers whole video
  const maxIntervalSec = useMemo(
    () => (durationSec > 0 ? durationSec / thumbnailCount : 1),
    [durationSec, thumbnailCount]
  )

  // Min interval: one frame (1 / framerate) - shows ~1 second when zoomed in
  const minIntervalSec = useMemo(
    () => 1 / framerateFps,
    [framerateFps]
  )

  const intervalSec = useMemo(
    () => calculateIntervalSec(zoomLevel, maxIntervalSec, minIntervalSec),
    [zoomLevel, maxIntervalSec, minIntervalSec]
  )

  // Visible duration is interval * count
  const visibleDurationSec = useMemo(
    () => intervalSec * thumbnailCount,
    [intervalSec, thumbnailCount]
  )

  // Calculate visible start based on zoom center
  const visibleStartSec = useMemo(() => {
    if (durationSec <= 0) return 0

    // Center the view around zoomCenterPercent of the video
    const centerTimeSec = zoomCenterPercent * durationSec
    let start = centerTimeSec - visibleDurationSec / 2

    // Clamp to valid range
    start = Math.max(0, start)
    start = Math.min(durationSec - visibleDurationSec, start)
    start = Math.max(0, start) // In case visibleDuration > duration

    return start
  }, [durationSec, zoomCenterPercent, visibleDurationSec])

  // Generate timestamps for visible thumbnails
  const timestamps = useMemo(() => {
    if (durationSec <= 0) return []

    const result: number[] = []
    for (let i = 0; i < thumbnailCount; i++) {
      const ts = visibleStartSec + i * intervalSec
      if (ts <= durationSec) {
        result.push(ts)
      }
    }
    return result
  }, [durationSec, thumbnailCount, visibleStartSec, intervalSec])

  const handleWheel = useCallback((event: WheelEvent) => {
    event.preventDefault()

    // Normalize wheel delta (different browsers report differently)
    const delta = event.deltaY > 0 ? -0.05 : 0.05

    setZoomLevel(prev => {
      const newLevel = Math.max(0, Math.min(1, prev + delta))
      return newLevel
    })
  }, [])

  const setZoomCenter = useCallback((percent: number) => {
    setZoomCenterPercent(Math.max(0, Math.min(1, percent)))
  }, [])

  return {
    zoomLevel,
    visibleStartSec,
    visibleDurationSec,
    intervalSec,
    thumbnailCount,
    timestamps,
    handleWheel,
    setZoomCenter
  }
}
