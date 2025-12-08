"use client"

import type React from "react"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { Upload, FileVideo } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useVideo, type VideoData } from "@/lib/video-context"

/**
 * Import screen for uploading video files.
 * Extracts video metadata and stores in context before navigating to actions.
 */
export function ImportScreen() {
  const router = useRouter()
  const { setVideoData } = useVideo()
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [videoInfo, setVideoInfo] = useState<{
    duration?: number
    width?: number
    height?: number
    size: string
  } | null>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type.startsWith("video/")) {
      processFile(droppedFile)
    }
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      processFile(selectedFile)
    }
  }

  const processFile = (file: File) => {
    setFile(file)

    // Get basic file info
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2)

    // Create video element to extract metadata
    const video = document.createElement("video")
    video.preload = "metadata"
    video.onloadedmetadata = () => {
      setVideoInfo({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        size: `${sizeInMB} MB`,
      })
      URL.revokeObjectURL(video.src)
    }
    video.src = URL.createObjectURL(file)
  }

  const handleContinue = () => {
    if (file) {
      setVideoData({
        file,
        duration: videoInfo?.duration,
        width: videoInfo?.width,
        height: videoInfo?.height,
        format: file.name.split(".").pop()?.toUpperCase(),
      })
      router.push("/actions")
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Import Video</h2>
        <p className="text-muted-foreground">Upload a video file to get started</p>
      </div>

      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragging ? "border-accent bg-accent/5" : "border-border"
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="p-12 text-center space-y-6">
          {!file ? (
            <>
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
                  <Upload className="w-10 h-10 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-lg">Drop your video file here</p>
                <p className="text-sm text-muted-foreground">or click to browse</p>
              </div>
              <input type="file" accept="video/*" onChange={handleFileInput} className="hidden" id="file-input" />
              <Button asChild variant="outline" size="lg">
                <label htmlFor="file-input" className="cursor-pointer">
                  Browse Files
                </label>
              </Button>
            </>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center">
                  <FileVideo className="w-10 h-10 text-accent" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-lg font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">Video file selected</p>
              </div>

              {videoInfo && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-secondary rounded-lg">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="text-sm font-mono">
                      {videoInfo.duration ? `${Math.floor(videoInfo.duration)}s` : "N/A"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Resolution</p>
                    <p className="text-sm font-mono">
                      {videoInfo.width && videoInfo.height ? `${videoInfo.width}×${videoInfo.height}` : "N/A"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Size</p>
                    <p className="text-sm font-mono">{videoInfo.size}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Format</p>
                    <p className="text-sm font-mono">{file.name.split(".").pop()?.toUpperCase()}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => setFile(null)}>
                  Change File
                </Button>
                <Button onClick={handleContinue} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  Continue →
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
