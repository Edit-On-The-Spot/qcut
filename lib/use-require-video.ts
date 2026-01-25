"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useVideo } from "./video-context"

/** Session key to track if we've navigated within the app */
const SPA_NAV_KEY = "qcut_spa_nav"

/**
 * Marks that the app has done an SPA navigation.
 * Called before router.push to indicate the next page load is SPA.
 */
export function markSpaNavigation() {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(SPA_NAV_KEY, Date.now().toString())
  }
}

/**
 * Checks if this is likely an SPA navigation (within last 2 seconds).
 */
function isRecentSpaNavigation(): boolean {
  if (typeof sessionStorage === "undefined") return false
  const timestamp = sessionStorage.getItem(SPA_NAV_KEY)
  if (!timestamp) return false
  const elapsed = Date.now() - parseInt(timestamp, 10)
  return elapsed < 2000 // Within 2 seconds
}

/**
 * Hook that requires video data to be present.
 * - On direct page load (no video data): redirects to home
 * - On SPA navigation: waits for video data
 */
export function useRequireVideo() {
  const router = useRouter()
  const { videoData, setVideoData, actionConfig, setActionConfig, reset } = useVideo()
  const [hasCheckedInitial, setHasCheckedInitial] = useState(false)
  const [shouldWait, setShouldWait] = useState(true)

  useEffect(() => {
    console.log("[useRequireVideo] videoData:", videoData ? `${videoData.file.name} (${videoData.file.size} bytes)` : "null")
  }, [videoData])

  // On mount, check if this is SPA navigation or direct page load
  useEffect(() => {
    if (hasCheckedInitial) return

    const isSpaNav = isRecentSpaNavigation()
    console.log("[useRequireVideo] Initial check - isSpaNav:", isSpaNav, "videoData:", !!videoData)

    if (videoData) {
      // Already have video data, we're good
      setShouldWait(false)
      setHasCheckedInitial(true)
    } else if (isSpaNav) {
      // SPA navigation - wait for video data
      console.log("[useRequireVideo] SPA navigation detected, waiting for video data")
      setShouldWait(true)
      setHasCheckedInitial(true)
    } else {
      // Direct page load with no video data - redirect
      console.log("[useRequireVideo] Direct page load with no video data, redirecting to home")
      setShouldWait(false)
      setHasCheckedInitial(true)
      router.replace("/")
    }
  }, [hasCheckedInitial, videoData, router])

  // If we were waiting and now have video data, stop waiting
  useEffect(() => {
    if (shouldWait && videoData) {
      console.log("[useRequireVideo] Video data received, stopping wait")
      setShouldWait(false)
    }
  }, [shouldWait, videoData])

  return {
    videoData,
    setVideoData,
    actionConfig,
    setActionConfig,
    reset,
    /** True when video data is available and ready to use */
    isReady: !!videoData,
    /** True when waiting for video data to be available */
    isLoading: !videoData && shouldWait,
  }
}
