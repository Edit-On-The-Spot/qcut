"use client"

import { useState } from "react"
import type { ActionConfig } from "@/lib/video-context"
import { useRequireVideo } from "@/lib/use-require-video"
import { VideoUploadPrompt } from "@/components/video-upload-prompt"
import { useVideoUrl } from "@/lib/use-video-url"
import { ProcessingButton } from "@/components/processing-button"
import { VideoPreview } from "@/components/video-preview"
import { VideoLoading } from "@/components/video-loading"
import { BackButton } from "@/components/back-button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

/**
 * Normalize audio screen for adjusting audio levels using loudnorm filter.
 * Allows setting target loudness, true peak, and loudness range.
 */
export function NormalizeAudioScreen() {
  const { videoData, isLoading, needsUpload } = useRequireVideo()
  const videoUrl = useVideoUrl(videoData?.file)
  const [targetLoudnessLufs, setTargetLoudnessLufs] = useState([-16])
  const [truePeakDb, setTruePeakDb] = useState([-1.5])
  const [loudnessRangeLu, setLoudnessRangeLu] = useState([11])

  const getActionConfig = (): ActionConfig => ({
    type: "normalize-audio",
    params: {
      targetLoudnessLufs: targetLoudnessLufs[0],
      truePeakDb: truePeakDb[0],
      loudnessRangeLu: loudnessRangeLu[0],
    },
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
            <h3 className="text-lg font-semibold">Normalize Audio</h3>
            <p className="text-sm text-muted-foreground">
              Adjust audio levels for consistent loudness using the EBU R128 loudnorm filter
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Target Loudness (LUFS)</Label>
                <span className="text-sm text-muted-foreground">{targetLoudnessLufs[0]} LUFS</span>
              </div>
              <Slider
                value={targetLoudnessLufs}
                onValueChange={setTargetLoudnessLufs}
                min={-24}
                max={-5}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                -16 LUFS is standard for streaming platforms. Lower values = quieter output.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>True Peak (dB)</Label>
                <span className="text-sm text-muted-foreground">{truePeakDb[0]} dB</span>
              </div>
              <Slider
                value={truePeakDb}
                onValueChange={setTruePeakDb}
                min={-3}
                max={0}
                step={0.5}
              />
              <p className="text-xs text-muted-foreground">
                Maximum peak level. -1.5 dB provides headroom to prevent clipping.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Loudness Range (LU)</Label>
                <span className="text-sm text-muted-foreground">{loudnessRangeLu[0]} LU</span>
              </div>
              <Slider
                value={loudnessRangeLu}
                onValueChange={setLoudnessRangeLu}
                min={1}
                max={20}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Dynamic range of loudness. Lower values = more consistent volume.
              </p>
            </div>
          </div>

          <div className="bg-background/50 rounded p-4 text-sm">
            <p className="text-muted-foreground">
              Audio normalization adjusts the overall loudness without changing the dynamic range significantly.
              This is useful for making audio consistent across different sources.
            </p>
            <p className="text-muted-foreground mt-2">Re-encoding required: audio filters must be re-encoded.</p>
          </div>

          <ProcessingButton config={getActionConfig()} />
        </div>
      </div>
    </div>
  )
}
