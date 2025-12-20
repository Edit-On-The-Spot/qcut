"use client"

import type React from "react"

import { useCallback, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { QcutHero } from "@/components/landing/qcut-hero"
import { QcutDropzone } from "@/components/landing/qcut-dropzone"
import { QcutFeatures } from "@/components/landing/qcut-features"
import { QcutFooter } from "@/components/landing/qcut-footer"
import { useVideo } from "@/lib/video-context"

/**
 * Import screen for uploading video files.
 * Displays a landing page with hero section, dropzone, and features.
 * Extracts video metadata and stores in context before navigating to actions.
 */
export function ImportScreen() {
  const router = useRouter()
  const { setVideoData } = useVideo()
  const [isDragging, setIsDragging] = useState(false)
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
    router.push("/actions")
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
        <QcutFeatures />
      </main>

      <QcutFooter />
    </div>
  )
}
