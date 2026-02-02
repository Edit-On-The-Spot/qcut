"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Repeat,
  Minimize2,
  Scissors,
  Music,
  Merge,
  ImageIcon,
  Maximize2,
  Grid3x3,
  Layers,
  ArrowLeft,
  Volume2,
  RotateCw,
  Image,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useRequireVideo } from "@/lib/use-require-video"
import { VideoLoading } from "@/components/video-loading"
import type { ActionType } from "@/lib/video-context"

/**
 * Available video operations, ordered to match landing page features.
 * This ensures consistent UX when users navigate from landing to actions.
 */
const actions: Array<{
  type: ActionType
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  {
    type: "trim",
    label: "Cut/Trim",
    description: "Cut and trim video segments",
    icon: Scissors,
  },
  {
    type: "convert",
    label: "Convert Format",
    description: "Change video format (MP4, WebM, AVI, etc.)",
    icon: Repeat,
  },
  {
    type: "extract-audio",
    label: "Extract Audio",
    description: "Extract audio track from video",
    icon: Music,
  },
  {
    type: "compress",
    label: "Compress Video",
    description: "Reduce file size while maintaining quality",
    icon: Minimize2,
  },
  {
    type: "resize",
    label: "Resize",
    description: "Change video dimensions",
    icon: Maximize2,
  },
  {
    type: "merge",
    label: "Merge Audio+Video",
    description: "Combine separate audio and video files",
    icon: Merge,
  },
  {
    type: "combine",
    label: "Combine Clips",
    description: "Concatenate multiple video clips",
    icon: Layers,
  },
  {
    type: "frame-extract",
    label: "Frame Extract",
    description: "Extract frames as images",
    icon: Grid3x3,
  },
  {
    type: "gif",
    label: "Create GIF",
    description: "Convert video to animated GIF",
    icon: ImageIcon,
  },
  {
    type: "normalize-audio",
    label: "Normalize Audio",
    description: "Adjust audio levels for consistent loudness",
    icon: Volume2,
  },
  {
    type: "rotate",
    label: "Rotate / Flip",
    description: "Rotate or flip your video",
    icon: RotateCw,
  },
  {
    type: "overlay",
    label: "Add Overlay",
    description: "Add image watermark or overlay",
    icon: Image,
  },
]

/**
 * Actions screen for selecting video operations.
 * Displays available operations and navigates to the selected operation page.
 */
export function ActionsScreen() {
  const router = useRouter()
  const { videoData, isLoading } = useRequireVideo()
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)

  // Generate thumbnail from video file
  useEffect(() => {
    if (!videoData?.file) return

    const video = document.createElement("video")
    const objectUrl = URL.createObjectURL(videoData.file)
    video.src = objectUrl
    video.preload = "metadata"
    video.muted = true

    video.onloadeddata = () => {
      // Seek to 1 second or 10% of duration for thumbnail
      video.currentTime = Math.min(1, (video.duration || 1) * 0.1)
    }

    video.onseeked = () => {
      const canvas = document.createElement("canvas")
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        setThumbnailUrl(canvas.toDataURL("image/jpeg", 0.7))
      }
      URL.revokeObjectURL(objectUrl)
    }

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl)
    }

    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [videoData?.file])

  const handleActionClick = (type: ActionType) => {
    router.push(`/${type}`)
  }

  if (isLoading || !videoData) {
    return <VideoLoading message="Loading video data..." />
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "N/A"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatFileSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB"
  }

  return (
    <div className="container mx-auto px-6 py-12 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4">
          {/* Video thumbnail */}
          <div className="w-24 h-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt="Video thumbnail"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{videoData.file.name}</p>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>{formatDuration(videoData.duration)}</span>
              <span>{videoData.width && videoData.height ? `${videoData.width}×${videoData.height}` : "N/A"}</span>
              <span>{formatFileSize(videoData.file.size)}</span>
              <span>{videoData.format}</span>
            </div>
          </div>
          {/* Ready for processing badge */}
          <div className="flex items-center gap-2 text-sm text-green-500 flex-shrink-0">
            <CheckCircle2 className="w-4 h-4" />
            <span>Ready for processing</span>
          </div>
        </div>
      </Card>

      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Choose Action</h2>
        <p className="text-muted-foreground">Select an operation to perform on your video</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Card
              key={action.type}
              className="p-6 border-2 border-transparent hover:border-primary transition-all cursor-pointer group"
              onClick={() => handleActionClick(action.type)}
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-secondary group-hover:bg-primary flex items-center justify-center transition-colors">
                  <Icon className="w-6 h-6 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold">{action.label}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{action.description}</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
    </div>
  )
}
