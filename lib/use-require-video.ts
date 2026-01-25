"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useVideo } from "./video-context"

/** How long to wait for video data before redirecting (ms) */
const WAIT_TIMEOUT_MS = 500

/**
 * @deprecated No longer needed - kept for backwards compatibility.
 * SPA navigation should preserve atom state automatically.
 */
export function markSpaNavigation() {
  // No-op - kept for backwards compatibility
}

/**
 * Hook that requires video data to be present.
 * Waits briefly for video data to appear (handles SPA navigation timing),
 * then redirects to home if no video data is found.
 */
export function useRequireVideo() {
  const router = useRouter()
  const { videoData, setVideoData, actionConfig, setActionConfig, reset } = useVideo()
  const [isWaiting, setIsWaiting] = useState(!videoData)
  const hasRedirected = useRef(false)

  useEffect(() => {
    console.log("[useRequireVideo] videoData:", videoData ? `${videoData.file.name} (${videoData.file.size} bytes)` : "null")
  }, [videoData])

  // If video data arrives, stop waiting
  useEffect(() => {
    if (videoData) {
      setIsWaiting(false)
    }
  }, [videoData])

  // If no video data after timeout, redirect to home
  useEffect(() => {
    if (videoData || hasRedirected.current) return

    const timer = setTimeout(() => {
      if (!videoData && !hasRedirected.current) {
        console.log("[useRequireVideo] No video data after timeout, redirecting to home")
        hasRedirected.current = true
        setIsWaiting(false)
        router.replace("/")
      }
    }, WAIT_TIMEOUT_MS)

    return () => clearTimeout(timer)
  }, [videoData, router])

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
  }
}
