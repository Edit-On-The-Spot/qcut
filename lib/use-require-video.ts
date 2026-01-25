"use client"

import { useEffect } from "react"
import { useVideo } from "./video-context"

/**
 * Hook that requires video data to be present.
 * Instead of redirecting, returns loading state so components can show a loading UI.
 * This prevents race conditions where redirects happen before atoms hydrate.
 */
export function useRequireVideo() {
  const { videoData, setVideoData, actionConfig, setActionConfig, reset } = useVideo()

  useEffect(() => {
    console.log("[useRequireVideo] videoData:", videoData ? `${videoData.file.name} (${videoData.file.size} bytes)` : "null")
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
    isLoading: !videoData,
  }
}
