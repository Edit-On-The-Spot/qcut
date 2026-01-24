"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useProcessingState } from "@/lib/video-context"
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
import { useState } from "react"

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

  useEffect(() => {
    if (!isProcessing) return

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
        setShowDialog(true)
        setPendingUrl(null) // Will use history.back() instead
      }
    }

    // Push a state so we can detect back navigation
    window.history.pushState(null, "", window.location.href)

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
