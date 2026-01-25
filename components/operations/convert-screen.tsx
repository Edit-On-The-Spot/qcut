"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import type { ActionConfig } from "@/lib/video-context"
import { useRequireVideo } from "@/lib/use-require-video"
import { useVideoUrl } from "@/lib/use-video-url"
import { useCodecDetection } from "@/lib/use-codec-detection"
import { ProcessingButton } from "@/components/processing-button"
import { VideoPreview } from "@/components/video-preview"
import { VideoLoading } from "@/components/video-loading"
import { BackButton } from "@/components/back-button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

/** Maps detected codec names to display names */
const CODEC_DISPLAY_NAMES: Record<string, string> = {
  h264: "H.264",
  hevc: "H.265/HEVC",
  h265: "H.265/HEVC",
  vp9: "VP9",
  vp8: "VP8",
  av1: "AV1",
  mpeg4: "MPEG-4",
  mpeg2video: "MPEG-2",
}

/**
 * Convert screen for changing video format.
 * Defaults to copying the input codec (no re-encode).
 * Detects current video codec using FFmpeg.
 */
export function ConvertScreen() {
  const { videoData, setVideoData, isLoading } = useRequireVideo()
  const videoUrl = useVideoUrl(videoData?.file)
  const { codecInfo, isDetecting, detectCodecs, isReady } = useCodecDetection()
  const [format, setFormat] = useState("mp4")
  const [codec, setCodec] = useState("copy") // Default to copy (no re-encode)
  const [hasDetected, setHasDetected] = useState(false)

  const detectedCodec = videoData?.codec || codecInfo?.videoCodec || null
  const detectedCodecDisplay = detectedCodec
    ? CODEC_DISPLAY_NAMES[detectedCodec] || detectedCodec.toUpperCase()
    : null

  // Detect codecs when FFmpeg is ready
  useEffect(() => {
    console.log("[ConvertScreen] Codec detection check - isReady:", isReady, "hasDetected:", hasDetected, "isDetecting:", isDetecting)
    if (isReady && !hasDetected && !isDetecting) {
      console.log("[ConvertScreen] Starting codec detection")
      setHasDetected(true)
      detectCodecs().then((info) => {
        console.log("[ConvertScreen] Codec detection result:", info)
        if (info?.videoCodec && videoData) {
          setVideoData((current) =>
            current ? { ...current, codec: info.videoCodec || undefined } : current
          )
        }
      })
    }
  }, [isReady, hasDetected, isDetecting, detectCodecs, videoData, setVideoData])

  const getActionConfig = (): ActionConfig => ({
    type: "convert",
    params: { format, codec },
  })

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
            <h3 className="text-lg font-semibold">Conversion Settings</h3>
            <p className="text-sm text-muted-foreground">Choose the output format and codec for your video</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Output Format</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mp4">MP4</SelectItem>
                  <SelectItem value="webm">WebM</SelectItem>
                  <SelectItem value="avi">AVI</SelectItem>
                  <SelectItem value="mov">MOV</SelectItem>
                  <SelectItem value="mkv">MKV</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Video Codec</Label>
              <Select value={codec} onValueChange={setCodec}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="copy">
                    {isDetecting ? (
                      "Detecting..."
                    ) : detectedCodecDisplay ? (
                      `${detectedCodecDisplay} (no re-encode)`
                    ) : (
                      "Copy (no re-encode)"
                    )}
                  </SelectItem>
                  {/* Only show re-encode options for codecs that differ from input */}
                  {detectedCodec !== "h264" && (
                    <SelectItem value="libx264">H.264 (re-encode)</SelectItem>
                  )}
                  {detectedCodec !== "hevc" && detectedCodec !== "h265" && (
                    <SelectItem value="libx265">H.265 (re-encode)</SelectItem>
                  )}
                  {detectedCodec !== "vp9" && (
                    <SelectItem value="libvpx-vp9">VP9 (re-encode)</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-background/50 rounded p-4 text-sm space-y-1">
            <p className="text-muted-foreground">Current format: {videoData!.format || "Unknown"}</p>
            <p className="text-muted-foreground flex items-center gap-2">
              Input codec:{" "}
              {isDetecting ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin inline" />
                  Detecting...
                </>
              ) : (
                detectedCodecDisplay || "Unknown"
              )}
            </p>
            {codecInfo?.audioCodec && (
              <p className="text-muted-foreground">Audio codec: {codecInfo.audioCodec}</p>
            )}
            {codec !== "copy" && (
              <p className="text-yellow-600 dark:text-yellow-500">
                Re-encoding to {codec} will be slower and may reduce quality.
              </p>
            )}
          </div>

          <ProcessingButton config={getActionConfig()} />
        </div>
      </div>
    </div>
  )
}
