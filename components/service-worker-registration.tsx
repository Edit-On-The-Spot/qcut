"use client"

import { useEffect, useRef } from "react"
import { useProcessingState } from "@/lib/video-context"

/**
 * Registers the service worker for PWA functionality.
 * Only activates in production to enable offline support.
 * Auto-reloads the page when a new version is available (unless processing).
 */
export function ServiceWorkerRegistration() {
  const { isProcessing } = useProcessingState()
  // Use ref to avoid stale closure in message listener
  const isProcessingRef = useRef(isProcessing)

  // Keep ref in sync with state
  useEffect(() => {
    isProcessingRef.current = isProcessing
  }, [isProcessing])

  useEffect(() => {
    // Only register service worker in production
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[SW] Service Worker registered with scope:", registration.scope)

          // Check for updates periodically (every 60 seconds)
          setInterval(() => {
            registration.update()
          }, 60000)
        })
        .catch((error) => {
          console.error("[SW] Service Worker registration failed:", error)
        })

      // Listen for messages from service worker
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === "SW_UPDATED") {
          console.log("[SW] New version available")
          // Use ref to get current processing state
          if (!isProcessingRef.current) {
            console.log("[SW] Reloading page for new version")
            window.location.reload()
          } else {
            console.log("[SW] Processing in progress, deferring reload")
          }
        }
      }

      navigator.serviceWorker.addEventListener("message", handleMessage)

      return () => {
        navigator.serviceWorker.removeEventListener("message", handleMessage)
      }
    }
  }, []) // Empty deps - only run once on mount

  return null
}
