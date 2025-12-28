"use client"

import { useState, useEffect, type RefObject } from "react"

const DEFAULT_FRAMERATE_FPS = 30

/**
 * Estimates video framerate by measuring frame timing intervals.
 * Uses requestVideoFrameCallback when available for accurate detection,
 * otherwise falls back to default 30fps.
 * @param videoRef - Reference to the video element
 * @returns framerateFps - Estimated framerate in frames per second
 */
export function useVideoFramerate(videoRef: RefObject<HTMLVideoElement | null>): number {
  const [framerateFps, setFramerateFps] = useState(DEFAULT_FRAMERATE_FPS)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Check if requestVideoFrameCallback is supported
    if (!("requestVideoFrameCallback" in video)) {
      return
    }

    const frameTimes: number[] = []
    let callbackId: number | null = null

    const measureFrame = (_now: number, metadata: VideoFrameCallbackMetadata) => {
      frameTimes.push(metadata.mediaTime)

      // Collect 10 frames to estimate framerate
      if (frameTimes.length >= 10) {
        const intervals: number[] = []
        for (let i = 1; i < frameTimes.length; i++) {
          const interval = frameTimes[i] - frameTimes[i - 1]
          if (interval > 0) {
            intervals.push(interval)
          }
        }

        if (intervals.length > 0) {
          const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
          const estimatedFps = Math.round(1 / avgInterval)
          // Clamp to reasonable range (1-120 fps)
          const clampedFps = Math.max(1, Math.min(120, estimatedFps))
          setFramerateFps(clampedFps)
        }
        return
      }

      callbackId = video.requestVideoFrameCallback(measureFrame)
    }

    const handlePlay = () => {
      frameTimes.length = 0
      callbackId = video.requestVideoFrameCallback(measureFrame)
    }

    const handlePause = () => {
      if (callbackId !== null) {
        video.cancelVideoFrameCallback(callbackId)
        callbackId = null
      }
    }

    video.addEventListener("play", handlePlay)
    video.addEventListener("pause", handlePause)

    // If video is already playing, start measuring
    if (!video.paused) {
      handlePlay()
    }

    return () => {
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
      if (callbackId !== null) {
        video.cancelVideoFrameCallback(callbackId)
      }
    }
  }, [videoRef])

  return framerateFps
}
