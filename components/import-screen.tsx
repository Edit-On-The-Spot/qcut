"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { QcutHero } from "@/components/landing/qcut-hero"
import { QcutDropzone } from "@/components/landing/qcut-dropzone"
import { QcutFeatures } from "@/components/landing/qcut-features"
import { QcutFooter } from "@/components/landing/qcut-footer"
import { FileSelectModal } from "@/components/file-select-modal"
import { useVideo, type ActionType } from "@/lib/video-context"

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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSelectVideo = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = (file: File) => {
    processFile(file)
  }

  const processFile = (file: File) => {
    // Get basic file info
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2)

    // Create video element to extract metadata
    const video = document.createElement("video")
    video.preload = "metadata"
    video.onloadedmetadata = () => {
      const info = {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        size: `${sizeInMB} MB`,
      }
      URL.revokeObjectURL(video.src)
      // Navigate immediately after metadata is loaded
      navigateToActions(file, info)
    }
    video.src = URL.createObjectURL(file)
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
    setVideoData({
      file,
      duration: info.duration,
      width: info.width,
      height: info.height,
      format: file.name.split(".").pop()?.toUpperCase(),
    })

    if (pendingAction) {
      router.push(`/${pendingAction}`)
      setPendingAction(null)
    } else {
      router.push("/actions")
    }
  }

  /**
   * Handles click on a feature card.
   * Opens the file-select modal and stores the action type to navigate to after file selection.
   */
  const handleFeatureClick = (actionType: ActionType) => {
    setPendingAction(actionType)
    setIsModalOpen(true)
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
        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        className="sr-only"
      />

      <main>
        <QcutHero onSelectVideo={handleSelectVideo} />
        <QcutDropzone onFileSelect={handleFileSelect} isDragging={isDragging} onDragStateChange={setIsDragging} />
        <QcutFeatures onFeatureClick={handleFeatureClick} />
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
        title={pendingAction ? `Select video for ${pendingAction.replace("-", " ")}` : "Select a video"}
      />
    </div>
  )
}
