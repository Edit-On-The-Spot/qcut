"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Upload, Film } from "lucide-react"
import { useVideo } from "@/lib/video-context"
import { FileSizeWarning, getFileSizeWarningType } from "@/components/file-size-warning"
import { createLogger } from "@/lib/logger"

const log = createLogger("video-upload-prompt")

/**
 * Inline upload prompt shown when a page requires video data but none is loaded.
 * Handles file selection via drag-and-drop or click, extracts video metadata,
 * and sets the video data in context so the parent page can render its content.
 */
export function VideoUploadPrompt() {
  const { setVideoData } = useVideo()
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileSizeWarning, setFileSizeWarning] = useState<{
    type: "error" | "warning"
    file: File
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0 && files[0].type.startsWith("video/")) {
      handleFileSelect(files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  /**
   * Validates file size and either shows a warning or proceeds with processing.
   */
  const handleFileSelect = (file: File) => {
    const warningType = getFileSizeWarningType(file.size)
    if (warningType) {
      setFileSizeWarning({ type: warningType, file })
    } else {
      processFile(file)
    }
  }

  /**
   * Extracts video metadata and sets video data in context.
   */
  const processFile = (file: File) => {
    setError(null)
    setIsProcessing(true)

    const video = document.createElement("video")
    video.preload = "metadata"
    const objectUrl = URL.createObjectURL(file)

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl)
      log.info("Video metadata loaded: %s (%dx%d, %ds)", file.name, video.videoWidth, video.videoHeight, video.duration)
      setVideoData({
        file,
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        format: file.name.split(".").pop()?.toUpperCase(),
      })

      // Load file data in background
      void file
        .arrayBuffer()
        .then((buffer) => {
          setVideoData((current) =>
            current?.file === file ? { ...current, fileData: new Uint8Array(buffer) } : current
          )
        })
        .catch(() => {})

      setIsProcessing(false)
    }

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      log.error("Failed to load video metadata for: %s", file.name)
      setError("Unable to load video. The file may be corrupted or in an unsupported format.")
      setIsProcessing(false)
    }

    video.src = objectUrl
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[400px] space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">No video loaded</h2>
        <p className="text-muted-foreground">Upload a video to get started</p>
      </div>

      <label
        htmlFor="video-upload-prompt"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center w-full
          min-h-[240px] rounded-2xl border-2 border-dashed
          cursor-pointer transition-all duration-300
          ${
            isDragging
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border hover:border-muted-foreground/50 hover:bg-muted/50"
          }
          ${isProcessing ? "pointer-events-none opacity-50" : ""}
        `}
      >
        <input
          ref={fileInputRef}
          id="video-upload-prompt"
          type="file"
          accept="video/*"
          onChange={handleFileInput}
          className="sr-only"
        />

        <div
          className={`
            flex items-center justify-center w-14 h-14 rounded-2xl mb-4
            ${isDragging ? "bg-primary/10" : "bg-muted"}
            transition-colors duration-300
          `}
        >
          {isDragging ? (
            <Film className="h-7 w-7 text-primary" />
          ) : isProcessing ? (
            <div className="w-7 h-7 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
          ) : (
            <Upload className="h-7 w-7 text-muted-foreground" />
          )}
        </div>

        <p className="text-base font-medium text-foreground">
          {isDragging ? "Drop your video here" : isProcessing ? "Processing..." : "Drag and drop a video"}
        </p>
        <p className="text-muted-foreground mt-1 text-sm">or click to browse files</p>
        <p className="text-xs text-muted-foreground mt-4">Supports MP4, WebM, MOV, AVI, MKV and more</p>
      </label>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

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
    </div>
  )
}
