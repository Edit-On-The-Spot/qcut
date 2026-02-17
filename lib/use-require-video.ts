"use client"

import { useEffect, useState } from "react"
import { useVideo } from "./video-context"

/** How long to wait for video data before showing upload prompt (ms) */
const WAIT_TIMEOUT_MS = 500

/**
 * Hook that requires video data to be present.
 * Waits briefly for video data to appear (handles SPA navigation timing),
 * then signals that the user needs to upload a video.
 */
export function useRequireVideo() {
  const { videoData, setVideoData, actionConfig, setActionConfig, reset } = useVideo()
  const [isWaiting, setIsWaiting] = useState(!videoData)

  // If video data arrives, stop waiting
  useEffect(() => {
    if (videoData) {
      setIsWaiting(false)
    }
  }, [videoData])

  // If no video data after timeout, stop waiting (shows upload prompt)
  useEffect(() => {
    if (videoData) return

    const timer = setTimeout(() => {
      if (!videoData) {
        setIsWaiting(false)
      }
    }, WAIT_TIMEOUT_MS)

    return () => clearTimeout(timer)
  }, [videoData])

  return {
    videoData,
    setVideoData,
    actionConfig,
    setActionConfig,
    reset,
    /** True when video data is available and ready to use */
    isReady: !!videoData,
    /** True when waiting for video data to be available */
    isLoading: isWaiting && !videoData,
    /** True when no video data is available and the user needs to upload */
    needsUpload: !isWaiting && !videoData,
  }
}
