"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Plus, X, GripVertical } from "lucide-react"
import { useVideo, type ActionConfig } from "@/lib/video-context"
import { ProcessingButton } from "@/components/processing-button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

/**
 * Combine screen for concatenating multiple video clips.
 * Allows adding multiple video files to merge into one.
 */
export function CombineScreen() {
  const router = useRouter()
  const { videoData, setActionConfig } = useVideo()
  const [clips, setClips] = useState<File[]>(videoData ? [videoData.file] : [])

  const handleAddClips = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setClips([...clips, ...files])
  }

  const removeClip = (index: number) => {
    setClips(clips.filter((_, i) => i !== index))
  }

  const getActionConfig = (): ActionConfig => ({
    type: "combine",
    params: {
      clips,
    },
  })

  if (!videoData) {
    router.push("/")
    return null
  }

  const formatFileSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB"
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => router.push("/actions")}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <div className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-2xl font-semibold">Combine Video Clips</h3>
          <p className="text-muted-foreground">Add multiple video files to combine them into one</p>
        </div>

        <div className="bg-secondary/50 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Label>Video Clips ({clips.length})</Label>
            <div>
              <Input
                type="file"
                accept="video/*"
                multiple
                onChange={handleAddClips}
                className="hidden"
                id="add-clips"
              />
              <Button variant="outline" size="sm" asChild>
                <label htmlFor="add-clips" className="cursor-pointer">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Clips
                </label>
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {clips.map((clip, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-4 bg-background rounded-lg border border-border hover:border-accent/50 transition-colors"
              >
                <GripVertical className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{clip.name}</p>
                  <p className="text-sm text-muted-foreground">{formatFileSize(clip.size)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">#{index + 1}</span>
                  {clips.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeClip(index)}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {clips.length < 2 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <p>Add at least 2 video clips to combine</p>
            </div>
          )}
        </div>

        <div className="bg-background/50 border border-border rounded-lg p-4 text-sm">
          <p className="text-muted-foreground">
            Total clips: {clips.length} | Total size: {formatFileSize(clips.reduce((sum, clip) => sum + clip.size, 0))}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Clips will be combined in the order shown above. Drag to reorder (coming soon).
          </p>
        </div>

        {clips.length >= 2 && <ProcessingButton config={getActionConfig()} />}
      </div>
    </div>
  )
}
