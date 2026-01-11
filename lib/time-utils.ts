"use client"

export function snapTimeToFrame(timeSec: number, framerateFps: number, durationSec: number): number {
  const safeFps = framerateFps > 0 ? framerateFps : 30
  const snapped = Math.round(timeSec * safeFps) / safeFps
  return Math.max(0, Math.min(durationSec, snapped))
}
