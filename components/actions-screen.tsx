"use client"

import { Button } from "@/components/ui/button"

import type React from "react"
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
} from "lucide-react"
import { Card } from "@/components/ui/card"
import type { ActionType, VideoData } from "@/app/page"

interface ActionsScreenProps {
  videoData: VideoData
  onActionSelect: (type: ActionType) => void
  onBack: () => void
}

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

export function ActionsScreen({ videoData, onActionSelect, onBack }: ActionsScreenProps) {
  const handleActionClick = (type: ActionType) => {
    onActionSelect(type)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

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
