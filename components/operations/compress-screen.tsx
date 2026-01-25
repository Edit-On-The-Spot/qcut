"use client"

import { useState } from "react"
import type { ActionConfig } from "@/lib/video-context"
import { useRequireVideo } from "@/lib/use-require-video"
import { useVideoUrl } from "@/lib/use-video-url"
import { ProcessingButton } from "@/components/processing-button"
import { VideoPreview } from "@/components/video-preview"
import { VideoLoading } from "@/components/video-loading"
import { BackButton } from "@/components/back-button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

/**
 * Compress screen for reducing video file size.
 * Allows adjusting quality (CRF) and encoding preset.
 */
export function CompressScreen() {
  const { videoData, isLoading } = useRequireVideo()
  const videoUrl = useVideoUrl(videoData?.file)
  const [quality, setQuality] = useState([28])
  const [preset, setPreset] = useState("medium")

  const getActionConfig = (): ActionConfig => ({
    type: "compress",
    params: { crf: quality[0], preset },
  })

  if (isLoading || !videoData) {
    return <VideoLoading />
  }

  const estimatedSize = () => {
    const fileSizeMB = videoData!.file.size / (1024 * 1024)
    const compressionFactor = quality[0] / 51
    return (fileSizeMB * compressionFactor).toFixed(2)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <BackButton />

      <div className="space-y-4">
        <VideoPreview src={videoUrl} />

        <div className="bg-secondary/50 rounded-lg p-6 space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Compression Settings</h3>
            <p className="text-sm text-muted-foreground">Adjust quality and speed settings to compress your video</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Quality (CRF)</Label>
                <span className="text-sm text-muted-foreground">{quality[0]}</span>
              </div>
              <Slider value={quality} onValueChange={setQuality} min={0} max={51} step={1} className="w-full" />
              <p className="text-xs text-muted-foreground">Lower = better quality, larger file (18-28 recommended)</p>
            </div>

            <div className="space-y-2">
              <Label>Encoding Preset</Label>
              <Select value={preset} onValueChange={setPreset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ultrafast">Ultra Fast (largest file)</SelectItem>
                  <SelectItem value="fast">Fast</SelectItem>
                  <SelectItem value="medium">Medium (balanced)</SelectItem>
                  <SelectItem value="slow">Slow</SelectItem>
                  <SelectItem value="veryslow">Very Slow (smallest file)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Slower presets = better compression, longer processing</p>
            </div>
          </div>

          <div className="bg-background/50 rounded p-4 text-sm space-y-1">
            <p className="text-muted-foreground">
              Original size: {(videoData!.file.size / (1024 * 1024)).toFixed(2)} MB
            </p>
            <p className="text-muted-foreground">Estimated size: ~{estimatedSize()} MB</p>
            <p className="text-muted-foreground">Re-encoding required: compression changes video bitrate.</p>
          </div>

          <ProcessingButton config={getActionConfig()} />
        </div>
      </div>
    </div>
  )
}
