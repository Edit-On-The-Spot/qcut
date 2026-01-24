"use client"

import { useEffect } from "react"
import { useProcessingState } from "@/lib/video-context"

/**
 * Registers the service worker for PWA functionality.
 * Only activates in production to enable offline support.
 * Auto-reloads the page when a new version is available (unless processing).
 */
export function ServiceWorkerRegistration() {
  const { isProcessing } = useProcessingState()

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
          console.log("Service Worker registered with scope:", registration.scope)

          // Check for updates periodically (every 60 seconds)
          setInterval(() => {
            registration.update()
          }, 60000)
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error)
        })

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "SW_UPDATED") {
          console.log("[SW] New version available")
          // Only auto-reload if not processing
          if (!isProcessing) {
            console.log("[SW] Reloading page for new version")
            window.location.reload()
          } else {
            console.log("[SW] Processing in progress, deferring reload")
          }
        }
      })
    }
  }, [isProcessing])

  return null
}
