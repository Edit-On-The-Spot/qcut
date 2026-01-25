"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Play, Pause, Loader2 } from "lucide-react"
import { useVideo, type ActionConfig } from "@/lib/video-context"
import { ProcessingButton } from "@/components/processing-button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCodecDetection } from "@/lib/use-codec-detection"

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

/** Maps detected codec names to FFmpeg encoder names */
const CODEC_TO_ENCODER: Record<string, string> = {
  h264: "libx264",
  hevc: "libx265",
  h265: "libx265",
  vp9: "libvpx-vp9",
  vp8: "libvpx",
  av1: "libaom-av1",
}

/**
 * Convert screen for changing video format.
 * Defaults to copying the input codec (no re-encode).
 * Detects current video codec using FFmpeg.
 */
export function ConvertScreen() {
  const router = useRouter()
  const { videoData, setVideoData } = useVideo()
  const { codecInfo, isDetecting, detectCodecs, isReady } = useCodecDetection()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [format, setFormat] = useState("mp4")
  const [codec, setCodec] = useState("copy") // Default to copy (no re-encode)
  const [videoUrl, setVideoUrl] = useState<string>("")
  const [hasDetected, setHasDetected] = useState(false)

  const detectedCodec = videoData?.codec || codecInfo?.videoCodec || null
  const detectedCodecDisplay = detectedCodec
    ? CODEC_DISPLAY_NAMES[detectedCodec] || detectedCodec.toUpperCase()
    : null

  useEffect(() => {
    if (!videoData) return
    const url = URL.createObjectURL(videoData.file)
    setVideoUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [videoData])

  // Detect codecs when FFmpeg is ready
  useEffect(() => {
    if (isReady && !hasDetected && !isDetecting) {
      setHasDetected(true)
      detectCodecs().then((info) => {
        if (info?.videoCodec && videoData) {
          setVideoData((current) =>
            current ? { ...current, codec: info.videoCodec || undefined } : current
          )
        }
      })
    }
  }, [isReady, hasDetected, isDetecting, detectCodecs, videoData, setVideoData])

  const togglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  // Redirect to home if no video is loaded
  useEffect(() => {
    if (!videoData) {
      router.push("/")
    }
  }, [videoData, router])

  const getActionConfig = (): ActionConfig => ({
    type: "convert",
    params: { format, codec },
  })

  if (!videoData) {
    return null
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => router.push("/actions")}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <div className="space-y-4">
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video ref={videoRef} src={videoUrl} className="w-full h-full object-contain" />
        </div>

        <div className="flex items-center justify-center">
          <Button variant="outline" size="lg" className="w-12 h-12 rounded-full bg-transparent" onClick={togglePlay}>
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </Button>
        </div>

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
                  <SelectItem value="libx264">H.264 (re-encode)</SelectItem>
                  <SelectItem value="libx265">H.265 (re-encode)</SelectItem>
                  <SelectItem value="libvpx-vp9">VP9 (re-encode)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-background/50 rounded p-4 text-sm space-y-1">
            <p className="text-muted-foreground">Current format: {videoData.format || "Unknown"}</p>
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
