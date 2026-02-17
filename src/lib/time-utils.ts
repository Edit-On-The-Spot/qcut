/**
 * Formats time as M:SS for display on timelines and selection info.
 * @param seconds - Time in seconds
 * @returns Formatted string like "1:05"
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

/**
 * Formats time with centisecond precision for thumbnail overlays.
 * @param seconds - Time in seconds
 * @returns Formatted string like "1:05.23"
 */
export function formatTimeWithCentiseconds(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const centiseconds = Math.floor((seconds % 1) * 100)
  return `${mins}:${secs.toString().padStart(2, "0")}.${centiseconds.toString().padStart(2, "0")}`
}

export function snapTimeToFrame(timeSec: number, framerateFps: number, durationSec: number): number {
  const safeFps = framerateFps > 0 ? framerateFps : 30
  const snapped = Math.round(timeSec * safeFps) / safeFps
  return Math.max(0, Math.min(durationSec, snapped))
}

/**
 * Converts a time in seconds to a frame number.
 * @param timeSec - Time in seconds
 * @param framerateFps - Framerate in frames per second
 * @returns Frame number
 */
export function timeToFrame(timeSec: number, framerateFps: number): number {
  const safeFps = framerateFps > 0 ? framerateFps : 30
  return Math.round(timeSec * safeFps)
}

/**
 * Converts a frame number to a time in seconds.
 * @param frame - Frame number
 * @param framerateFps - Framerate in frames per second
 * @returns Time in seconds
 */
export function frameToTime(frame: number, framerateFps: number): number {
  const safeFps = framerateFps > 0 ? framerateFps : 30
  return frame / safeFps
}

/**
 * Calculates the timestamp from a mouse X position within a container.
 * Used for draggable markers and timeline interactions.
 * @param mouseX - Mouse X position in pixels relative to container
 * @param containerWidth - Width of the container in pixels
 * @param visibleStart - Start time of the visible range in seconds
 * @param visibleEnd - End time of the visible range in seconds
 * @returns Timestamp in seconds at the mouse position
 */
export function calculateTimeFromMousePosition(
  mouseX: number,
  containerWidth: number,
  visibleStart: number,
  visibleEnd: number
): number {
  if (containerWidth <= 0) return visibleStart
  const percent = Math.max(0, Math.min(1, mouseX / containerWidth))
  return visibleStart + percent * (visibleEnd - visibleStart)
}
