"use client"

import { useState } from "react"
import { RotateCw, FlipHorizontal, FlipVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ActionConfig } from "@/lib/video-context"
import { useRequireVideo } from "@/lib/use-require-video"
import { VideoUploadPrompt } from "@/components/video-upload-prompt"
import { useVideoUrl } from "@/lib/use-video-url"
import { ProcessingButton } from "@/components/processing-button"
import { VideoPreview } from "@/components/video-preview"
import { VideoLoading } from "@/components/video-loading"
import { BackButton } from "@/components/back-button"
import { Label } from "@/components/ui/label"

/** File extensions that support lossless rotation via metadata */
const LOSSLESS_ROTATION_EXTENSIONS = ["mp4", "mov", "m4v"]

/**
 * Checks if a filename has an extension that supports lossless rotation.
 * MP4/MOV containers can store rotation as metadata without re-encoding.
 */
function isLosslessRotationSupported(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() || ""
  return LOSSLESS_ROTATION_EXTENSIONS.includes(ext)
}

/**
 * Rotate screen for rotating and flipping video.
 * Supports 90/180/270 degree rotations and horizontal/vertical flips.
 * Uses lossless metadata rotation for MP4/MOV when only rotating (no flips).
 */
export function RotateScreen() {
  const { videoData, isLoading, needsUpload } = useRequireVideo()
  const videoUrl = useVideoUrl(videoData?.file)
  const [rotation, setRotation] = useState(0)
  const [isFlipHorizontal, setIsFlipHorizontal] = useState(false)
  const [isFlipVertical, setIsFlipVertical] = useState(false)

  const isLosslessFormat = videoData ? isLosslessRotationSupported(videoData.file.name) : false
  const hasFlip = isFlipHorizontal || isFlipVertical
  const willUseLossless = isLosslessFormat && !hasFlip && rotation !== 0

  const getActionConfig = (): ActionConfig => ({
    type: "rotate",
    params: {
      rotation,
      isFlipHorizontal,
      isFlipVertical,
      isLosslessFormat,
    },
  })

  const getPreviewTransform = (): React.CSSProperties => {
    const transforms: string[] = []
    // For 90°/270° rotation, scale down to prevent cropping since dimensions swap
    if (rotation === 90 || rotation === 270) {
      const w = videoData?.width || 16
      const h = videoData?.height || 9
      const scale = Math.min(w / h, h / w)
      transforms.push(`scale(${scale})`)
    }
    if (rotation !== 0) {
      transforms.push(`rotate(${rotation}deg)`)
    }
    if (isFlipHorizontal) {
      transforms.push("scaleX(-1)")
    }
    if (isFlipVertical) {
      transforms.push("scaleY(-1)")
    }
    return { transform: transforms.join(" ") }
  }

  const hasTransformation = rotation !== 0 || isFlipHorizontal || isFlipVertical

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
        <VideoPreview
          src={videoUrl}
          videoStyle={getPreviewTransform()}
          videoClassName="transition-transform duration-300"
        />

        <div className="bg-secondary/50 rounded-lg p-6 space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Rotate & Flip</h3>
            <p className="text-sm text-muted-foreground">Rotate or flip your video</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <Label>Rotation</Label>
              <div className="flex gap-2">
                {[0, 90, 180, 270].map((deg) => (
                  <Button
                    key={deg}
                    variant={rotation === deg ? "default" : "outline"}
                    className={rotation !== deg ? "bg-transparent" : ""}
                    onClick={() => setRotation(deg)}
                  >
                    <RotateCw
                      className="w-4 h-4 mr-2"
                      style={{ transform: `rotate(${deg}deg)` }}
                    />
                    {deg}°
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Flip</Label>
              <div className="flex gap-2">
                <Button
                  variant={isFlipHorizontal ? "default" : "outline"}
                  className={!isFlipHorizontal ? "bg-transparent" : ""}
                  onClick={() => setIsFlipHorizontal(!isFlipHorizontal)}
                >
                  <FlipHorizontal className="w-4 h-4 mr-2" />
                  Horizontal
                </Button>
                <Button
                  variant={isFlipVertical ? "default" : "outline"}
                  className={!isFlipVertical ? "bg-transparent" : ""}
                  onClick={() => setIsFlipVertical(!isFlipVertical)}
                >
                  <FlipVertical className="w-4 h-4 mr-2" />
                  Vertical
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-background/50 rounded p-4 text-sm space-y-1">
            <p className="text-muted-foreground">
              Current: {rotation}° rotation
              {isFlipHorizontal && ", flipped horizontally"}
              {isFlipVertical && ", flipped vertically"}
              {!hasTransformation && " (no changes)"}
            </p>
            {hasTransformation && (
              <p className={willUseLossless ? "text-green-500" : "text-muted-foreground"}>
                {willUseLossless
                  ? "Lossless mode: rotation via metadata (no re-encoding)"
                  : hasFlip && isLosslessFormat
                    ? "Re-encoding required: flips cannot be done losslessly"
                    : !isLosslessFormat
                      ? "Re-encoding required: format does not support lossless rotation"
                      : ""}
              </p>
            )}
          </div>

          <ProcessingButton config={getActionConfig()} />
        </div>
      </div>
    </div>
  )
}
