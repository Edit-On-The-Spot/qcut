"use client"

import type React from "react"
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
  FileVideo,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useVideo, type ActionType } from "@/lib/video-context"

const actions: Array<{
  type: ActionType
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  {
    type: "convert",
    label: "Convert Format",
    description: "Change video format (MP4, WebM, AVI, etc.)",
    icon: Repeat,
  },
  {
    type: "compress",
    label: "Compress Video",
    description: "Reduce file size while maintaining quality",
    icon: Minimize2,
  },
  {
    type: "trim",
    label: "Cut/Trim",
    description: "Cut and trim video segments",
    icon: Scissors,
  },
  {
    type: "extract-audio",
    label: "Extract Audio",
    description: "Extract audio track from video",
    icon: Music,
  },
  {
    type: "merge",
    label: "Merge Audio+Video",
    description: "Combine separate audio and video files",
    icon: Merge,
  },
  {
    type: "gif",
    label: "Create GIF",
    description: "Convert video to animated GIF",
    icon: ImageIcon,
  },
  {
    type: "resize",
    label: "Resize",
    description: "Change video dimensions",
    icon: Maximize2,
  },
  {
    type: "frame-extract",
    label: "Frame Extract",
    description: "Extract frames as images",
    icon: Grid3x3,
  },
  {
    type: "combine",
    label: "Combine Clips",
    description: "Concatenate multiple video clips",
    icon: Layers,
  },
]

/**
 * Actions screen for selecting video operations.
 * Displays available operations and navigates to the selected operation page.
 */
export function ActionsScreen() {
  const router = useRouter()
  const { videoData } = useVideo()

  const handleActionClick = (type: ActionType) => {
    router.push(`/${type}`)
  }

  if (!videoData) {
    router.push("/")
    return null
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
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center">
            <FileVideo className="w-6 h-6 text-accent" />
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
              className="p-6 hover:border-accent transition-colors cursor-pointer group"
              onClick={() => handleActionClick(action.type)}
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-secondary group-hover:bg-accent/20 flex items-center justify-center transition-colors">
                  <Icon className="w-6 h-6 text-muted-foreground group-hover:text-accent transition-colors" />
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
  )
}
