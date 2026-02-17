"use client"

import { useEffect, useState, useRef } from "react"
import { useVideo } from "./video-context"
import { saveVideoData, loadVideoData } from "./video-storage"

/** How long to wait for video data before showing upload prompt (ms) */
const WAIT_TIMEOUT_MS = 500

/**
 * Hook that requires video data to be present.
 * Attempts to restore video data from IndexedDB if the in-memory atom is empty
 * (handles full page reloads where SPA state is lost). Falls back to showing
 * an upload prompt if no persisted data is found.
 */
export function useRequireVideo() {
  const { videoData, setVideoData, actionConfig, setActionConfig, reset } = useVideo()
  const [isWaiting, setIsWaiting] = useState(!videoData)
  const hasAttemptedRestore = useRef(false)

  // Try to restore video data from IndexedDB on mount
  useEffect(() => {
    if (videoData || hasAttemptedRestore.current) return
    hasAttemptedRestore.current = true

    loadVideoData()
      .then((restored) => {
        if (restored) {
          setVideoData(restored)
          // Load fileData in background for processing
          restored.file
            .arrayBuffer()
            .then((buffer) => {
              setVideoData((current) =>
                current?.file.name === restored.file.name
                  ? { ...current, fileData: new Uint8Array(buffer) }
                  : current
              )
            })
            .catch(() => {})
        }
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist video data to IndexedDB when a new video is loaded
  const lastSavedFileRef = useRef<string | null>(null)
  useEffect(() => {
    if (!videoData) return
    // Deduplicate by file identity to avoid re-saving on fileData updates
    const fileKey = `${videoData.file.name}:${videoData.file.size}:${videoData.file.lastModified}`
    if (lastSavedFileRef.current === fileKey) return
    lastSavedFileRef.current = fileKey
    saveVideoData(videoData).catch(() => {})
  }, [videoData])

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
