"use client"

import { useEffect, useRef } from "react"
import { useProcessingState } from "@/lib/video-context"

/**
 * Registers the service worker for PWA functionality.
 * Only activates in production to enable offline support.
 * Auto-reloads the page when a new service worker takes control.
 */
export function ServiceWorkerRegistration() {
  const { isProcessing } = useProcessingState()
  // Use ref to avoid stale closure in event listeners
  const isProcessingRef = useRef(isProcessing)
  // Track if we've already scheduled a reload
  const reloadScheduledRef = useRef(false)

  // Keep ref in sync with state
  useEffect(() => {
    isProcessingRef.current = isProcessing
    // If processing just finished and a reload was pending, reload now
    if (!isProcessing && reloadScheduledRef.current) {
      console.log("[SW] Processing finished, reloading for pending update")
      window.location.reload()
    }
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

      /**
       * Handles reload when a new service worker takes control.
       * Uses ref to check current processing state.
       */
      const handleReload = () => {
        if (!isProcessingRef.current) {
          console.log("[SW] Reloading page for new version")
          window.location.reload()
        } else {
          console.log("[SW] Processing in progress, will reload when done")
          reloadScheduledRef.current = true
        }
      }

      // Listen for controller change - fires when new SW takes control
      // This is more reliable than waiting for messages
      const handleControllerChange = () => {
        console.log("[SW] New service worker took control")
        handleReload()
      }
      navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange)

      // Also listen for messages as a backup
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === "SW_UPDATED") {
          console.log("[SW] Received SW_UPDATED message")
          handleReload()
        }
      }
      navigator.serviceWorker.addEventListener("message", handleMessage)

      return () => {
        navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange)
        navigator.serviceWorker.removeEventListener("message", handleMessage)
      }
    }
  }, []) // Empty deps - only run once on mount

  return null
}
