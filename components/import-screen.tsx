"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { QcutHero } from "@/components/landing/qcut-hero"
import { QcutDropzone } from "@/components/landing/qcut-dropzone"
import { WhyQcutSection } from "@/components/landing/why-qcut-section"
import { QcutFeatures } from "@/components/landing/qcut-features"
import { HowItWorksSection } from "@/components/landing/how-it-works-section"
import { FAQSection } from "@/components/landing/faq-section"
import { FinalCTASection } from "@/components/landing/final-cta-section"
import { QcutFooter } from "@/components/landing/qcut-footer"
import { FileSelectModal } from "@/components/file-select-modal"
import { FileSizeWarning, getFileSizeWarningType } from "@/components/file-size-warning"
import { useVideo, type ActionType } from "@/lib/video-context"
import { createLogger } from "@/lib/logger"
import { trackVideoImport, trackVideoImportError, trackFeatureClick } from "@/lib/analytics"

const log = createLogger("import-screen")

/**
 * Import screen for selecting video files.
 * Displays a landing page with hero section, dropzone, and features.
 * Extracts video metadata and stores in context before navigating to actions.
 * When user clicks a feature without a video loaded, shows a file-select modal.
 */
export function ImportScreen() {
  const router = useRouter()
  const { setVideoData } = useVideo()
  const [isDragging, setIsDragging] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<ActionType | null>(null)
  const [fileSizeWarning, setFileSizeWarning] = useState<{
    type: "error" | "warning"
    file: File
  } | null>(null)
  const [videoLoadError, setVideoLoadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Use ref to avoid stale closure in async callbacks
  const pendingActionRef = useRef<ActionType | null>(null)

  // Keep ref in sync with state
  useEffect(() => {
    pendingActionRef.current = pendingAction
  }, [pendingAction])

  // Prefetch destination routes so router.push() uses SPA navigation
  useEffect(() => {
    const actionTypes: ActionType[] = [
      "trim", "convert", "extract-audio", "compress", "resize", "merge",
      "combine", "frame-extract", "gif", "normalize-audio", "rotate", "overlay",
    ]
    router.prefetch("/actions")
    for (const type of actionTypes) {
      router.prefetch(`/${type}`)
    }
  }, [router])

  const handleSelectVideo = () => {
    fileInputRef.current?.click()
  }

  /**
   * Validates file size and either shows a warning or proceeds with processing.
   * @param file - The selected video file
   */
  const handleFileSelect = (file: File) => {
    const warningType = getFileSizeWarningType(file.size)
    if (warningType) {
      setFileSizeWarning({ type: warningType, file })
    } else {
      processFile(file)
    }
  }

  const processFile = (file: File) => {
    // Clear any previous error
    setVideoLoadError(null)

    // Get basic file info
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2)
    log.info("Processing file: %s (%sMB)", file.name, sizeInMB)

    // Create video element to extract metadata
    const video = document.createElement("video")
    video.preload = "metadata"
    const objectUrl = URL.createObjectURL(file)

    video.onloadedmetadata = () => {
      const info = {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        size: `${sizeInMB} MB`,
      }
      URL.revokeObjectURL(objectUrl)
      log.debug("Metadata loaded: duration=%d, dimensions=%dx%d", info.duration, info.width, info.height)
      // Navigate immediately after metadata is loaded
      navigateToActions(file, info)
    }

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      log.error("Failed to load video metadata for: %s", file.name)
      const errorMsg = "Unable to load video. The file may be corrupted or in an unsupported format."
      trackVideoImportError(errorMsg)
      setVideoLoadError(errorMsg)
    }

    video.src = objectUrl
  }

  /**
   * Navigates to the appropriate screen after video metadata is loaded.
   * If there's a pending action (user clicked a feature), navigates directly to that action.
   * Otherwise, navigates to the actions selection screen.
   */
  const navigateToActions = (
    file: File,
    info: { duration: number; width: number; height: number; size: string }
  ) => {
    log.info("Setting video data: %s", file.name)
    const fileSizeMB = file.size / (1024 * 1024)
    trackVideoImport(file.name, fileSizeMB)
    setVideoData({
      file,
      duration: info.duration,
      width: info.width,
      height: info.height,
      format: file.name.split(".").pop()?.toUpperCase(),
    })

    // Navigate after a microtask to ensure atom update propagates
    queueMicrotask(() => {
      // Use ref to get latest pending action (avoids stale closure)
      const action = pendingActionRef.current
      const destination = action ? `/${action}` : "/actions"
      log.debug("Navigating to: %s (pendingAction: %s)", destination, action)
      router.push(destination)
      if (action) {
        setPendingAction(null)
      }
    })

    // Load file data in background (not needed for navigation)
    void file
      .arrayBuffer()
      .then((buffer) => {
        setVideoData((current) =>
          current?.file === file ? { ...current, fileData: new Uint8Array(buffer) } : current
        )
      })
      .catch(() => {})
  }

  /**
   * Handles click on a feature card.
   * Opens the file-select modal and stores the action type to navigate to after file selection.
   */
  const handleFeatureClick = (actionType: ActionType) => {
    // Set ref immediately to avoid stale closure issues
    pendingActionRef.current = actionType
    setPendingAction(actionType)
    setIsModalOpen(true)
    trackFeatureClick(actionType)
  }

  /**
   * Handles file selection from the modal.
   * Closes the modal and processes the selected file.
   */
  const handleModalFileSelect = (file: File) => {
    setIsModalOpen(false)
    processFile(file)
  }

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Hidden file input for hero button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        aria-label="Select video file"
        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        className="sr-only"
      />

      <main>
        <QcutHero onSelectVideo={handleSelectVideo} />
        <QcutDropzone onFileSelect={handleFileSelect} isDragging={isDragging} onDragStateChange={setIsDragging} />
        <WhyQcutSection />
        <QcutFeatures onFeatureClick={handleFeatureClick} />
        <HowItWorksSection />
        <FAQSection />
        <FinalCTASection onStartEditing={handleSelectVideo} />
      </main>

      <QcutFooter />

      {/* File select modal shown when user clicks a feature without a video loaded */}
      <FileSelectModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setPendingAction(null)
        }}
        onFileSelect={handleModalFileSelect}
        title={pendingAction ? `Select video to ${pendingAction.replace("-", " ")}` : "Select a video"}
      />

      {/* File size warning dialog */}
      {fileSizeWarning && (
        <FileSizeWarning
          type={fileSizeWarning.type}
          isOpen={true}
          fileSizeBytes={fileSizeWarning.file.size}
          onClose={() => setFileSizeWarning(null)}
          onProceed={() => {
            const file = fileSizeWarning.file
            setFileSizeWarning(null)
            processFile(file)
          }}
        />
      )}

      {/* Video load error toast */}
      {videoLoadError && (
        <div className="fixed bottom-4 right-4 z-50 bg-destructive text-destructive-foreground px-4 py-3 rounded-md shadow-lg flex items-center gap-3">
          <span>{videoLoadError}</span>
          <button
            onClick={() => setVideoLoadError(null)}
            className="text-destructive-foreground/70 hover:text-destructive-foreground"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  )
}
