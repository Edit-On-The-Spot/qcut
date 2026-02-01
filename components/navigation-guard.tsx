"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useProcessingState } from "@/lib/video-context"
import { createLogger } from "@/lib/logger"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const log = createLogger("navigation-guard")

/**
 * Navigation guard that warns users when trying to navigate away during processing.
 * Shows a confirmation dialog and cancels processing if user confirms.
 * Must be placed in layout to intercept all navigation.
 */
export function NavigationGuard() {
  const { isProcessing, cancelProcessing } = useProcessingState()
  const [showDialog, setShowDialog] = useState(false)
  const [pendingUrl, setPendingUrl] = useState<string | null>(null)
  const router = useRouter()
  const isNavigatingRef = useRef(false)
  // Track whether we've already pushed state for this processing session
  const hasPushedStateRef = useRef(false)

  useEffect(() => {
    if (!isProcessing) {
      // Reset the flag when processing ends
      hasPushedStateRef.current = false
      return
    }

    // Intercept link clicks
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest("a")

      if (link && link.href && !link.target && !link.download) {
        const url = new URL(link.href)
        // Only intercept internal navigation
        if (url.origin === window.location.origin && url.pathname !== window.location.pathname) {
          e.preventDefault()
          e.stopPropagation()
          log.debug("Intercepted navigation to: %s", url.pathname)
          setPendingUrl(url.pathname)
          setShowDialog(true)
        }
      }
    }

    // Intercept browser back/forward
    const handlePopState = () => {
      if (isProcessing && !isNavigatingRef.current) {
        // Push current state back to prevent navigation
        window.history.pushState(null, "", window.location.href)
        log.debug("Intercepted back navigation")
        setShowDialog(true)
        setPendingUrl(null) // Will use history.back() instead
      }
    }

    // Push a state so we can detect back navigation - only once per processing session
    if (!hasPushedStateRef.current) {
      window.history.pushState(null, "", window.location.href)
      hasPushedStateRef.current = true
      log.debug("Pushed history state for navigation guard")
    }

    document.addEventListener("click", handleClick, true)
    window.addEventListener("popstate", handlePopState)

    return () => {
      document.removeEventListener("click", handleClick, true)
      window.removeEventListener("popstate", handlePopState)
    }
  }, [isProcessing])

  const handleCancel = () => {
    setShowDialog(false)
    setPendingUrl(null)
  }

  const handleConfirm = async () => {
    isNavigatingRef.current = true
    await cancelProcessing()
    setShowDialog(false)

    if (pendingUrl) {
      router.push(pendingUrl)
    } else {
      // User tried to go back
      window.history.back()
    }

    setPendingUrl(null)
    isNavigatingRef.current = false
  }

  return (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Processing in Progress</AlertDialogTitle>
          <AlertDialogDescription>
            Video processing is currently in progress. If you navigate away, the
            processing will be cancelled and you will lose any progress.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            Continue Processing
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            Cancel & Navigate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
