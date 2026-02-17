"use client"

import { useState, useEffect } from "react"
import type { ActionConfig } from "@/lib/video-context"
import { useRequireVideo } from "@/lib/use-require-video"
import { VideoUploadPrompt } from "@/components/video-upload-prompt"
import { useVideoUrl } from "@/lib/use-video-url"
import { ProcessingButton } from "@/components/processing-button"
import { VideoPreview } from "@/components/video-preview"
import { VideoLoading } from "@/components/video-loading"
import { BackButton } from "@/components/back-button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

/**
 * Resize screen for changing video dimensions.
 * Allows selecting preset resolutions or custom dimensions.
 */
export function ResizeScreen() {
  const { videoData, isLoading, needsUpload } = useRequireVideo()
  const videoUrl = useVideoUrl(videoData?.file)
  const [preset, setPreset] = useState("custom")
  const [width, setWidth] = useState(videoData?.width?.toString() || "1920")
  const [height, setHeight] = useState(videoData?.height?.toString() || "1080")

  useEffect(() => {
    if (videoData) {
      setWidth(videoData.width?.toString() || "1920")
      setHeight(videoData.height?.toString() || "1080")
    }
  }, [videoData])

  const handlePresetChange = (value: string) => {
    setPreset(value)
    if (value === "1080p") {
      setWidth("1920")
      setHeight("1080")
    } else if (value === "720p") {
      setWidth("1280")
      setHeight("720")
    } else if (value === "480p") {
      setWidth("854")
      setHeight("480")
    } else if (value === "360p") {
      setWidth("640")
      setHeight("360")
    }
  }

  const getActionConfig = (): ActionConfig => ({
    type: "resize",
    params: { width, height },
  })

  if (needsUpload) {
    return <VideoUploadPrompt />
  }

  if (isLoading || !videoData) {
    return <VideoLoading />
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <BackButton />

      <div className="space-y-4">
        <VideoPreview src={videoUrl} />

        <div className="bg-secondary/50 rounded-lg p-6 space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Resize Settings</h3>
            <p className="text-sm text-muted-foreground">Change the dimensions of your video</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Preset Resolutions</Label>
              <Select value={preset} onValueChange={handlePresetChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1080p">1080p (1920×1080)</SelectItem>
                  <SelectItem value="720p">720p (1280×720)</SelectItem>
                  <SelectItem value="480p">480p (854×480)</SelectItem>
                  <SelectItem value="360p">360p (640×360)</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Width (pixels)</Label>
                <Input
                  type="number"
                  value={width}
                  onChange={(e) => {
                    setWidth(e.target.value)
                    setPreset("custom")
                  }}
                  placeholder="1920"
                />
              </div>

              <div className="space-y-2">
                <Label>Height (pixels)</Label>
                <Input
                  type="number"
                  value={height}
                  onChange={(e) => {
                    setHeight(e.target.value)
                    setPreset("custom")
                  }}
                  placeholder="1080"
                />
              </div>
            </div>
          </div>

          <div className="bg-background/50 rounded p-4 text-sm space-y-1">
            <p className="text-muted-foreground">
              Current: {videoData!.width || "—"} × {videoData!.height || "—"}
            </p>
            <p className="text-muted-foreground">
              New: {width} × {height}
            </p>
            <p className="text-muted-foreground">Re-encoding required: resizing changes video frames.</p>
          </div>

          <ProcessingButton config={getActionConfig()} />
        </div>
      </div>
    </div>
  )
}
