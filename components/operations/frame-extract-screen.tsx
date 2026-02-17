"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Play, Pause } from "lucide-react"
import type { ActionConfig } from "@/lib/video-context"
import { useRequireVideo } from "@/lib/use-require-video"
import { VideoUploadPrompt } from "@/components/video-upload-prompt"
import { VideoLoading } from "@/components/video-loading"
import { ProcessingButton } from "@/components/processing-button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useVideoFramerate } from "@/lib/use-video-framerate"
import { snapTimeToFrame } from "@/lib/time-utils"

/**
 * Frame extract screen for extracting frames as images.
 * Allows extracting single frame or frames at intervals.
 */
export function FrameExtractScreen() {
  const router = useRouter()
  const { videoData, setActionConfig, isLoading, needsUpload } = useRequireVideo()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [extractMode, setExtractMode] = useState("interval")
  const [interval, setIntervalValue] = useState("1")
  const [format, setFormat] = useState("png")
  const [videoUrl, setVideoUrl] = useState<string>("")

  const framerateFps = useVideoFramerate(videoRef)

  useEffect(() => {
    if (!videoData) return
    const url = URL.createObjectURL(videoData.file)
    setVideoUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [videoData])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
    }

    video.addEventListener("loadedmetadata", handleLoadedMetadata)
    video.addEventListener("timeupdate", handleTimeUpdate)

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      video.removeEventListener("timeupdate", handleTimeUpdate)
    }
  }, [videoUrl])

  const togglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const snapTime = (timeSec: number) => snapTimeToFrame(timeSec, framerateFps, duration)

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const time = snapTime(percentage * duration)
    videoRef.current.currentTime = time
    setCurrentTime(time)
  }

  const getActionConfig = (): ActionConfig => ({
    type: "frame-extract",
    params: {
      mode: extractMode,
      interval: extractMode === "interval" ? interval : undefined,
      timestamp: extractMode === "single" ? snapTime(currentTime).toFixed(3) : undefined,
      format,
    },
  })

  if (needsUpload) {
    return <VideoUploadPrompt />
  }

  if (isLoading || !videoData) {
    return <VideoLoading />
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const estimatedFrames = () => {
    if (extractMode === "interval") {
      return Math.floor(duration / Number.parseFloat(interval || "1"))
    }
    if (extractMode === "single") {
      return 1
    }
    if (extractMode === "all") {
      return Math.floor(duration * framerateFps)
    }
    return "—"
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

        <div className="space-y-2">
          <div className="relative h-1.5 bg-secondary rounded-full cursor-pointer group" onClick={handleTimelineClick}>
            <div
              className="absolute top-0 left-0 h-full bg-accent rounded-full transition-all"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-accent rounded-full shadow-lg transition-all"
              style={{ left: `${(currentTime / duration) * 100}%`, marginLeft: "-0.5rem" }}
            />
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="bg-secondary/50 rounded-lg p-6 space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Frame Extraction Settings</h3>
            <p className="text-sm text-muted-foreground">Extract frames from your video as images</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Extraction Mode</Label>
              <Select value={extractMode} onValueChange={setExtractMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single frame (current time)</SelectItem>
                  <SelectItem value="interval">Every N seconds</SelectItem>
                  <SelectItem value="all">All frames</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {extractMode === "single" && (
              <div className="space-y-2">
                <Label>Current Frame</Label>
                <p className="text-sm text-muted-foreground">This will extract the frame at the current timestamp.</p>
              </div>
            )}

            {extractMode === "interval" && (
              <div className="space-y-2">
                <Label>Interval (seconds)</Label>
                <Input
                  type="number"
                  value={interval}
                  onChange={(e) => setIntervalValue(e.target.value)}
                  placeholder="1"
                  step="0.1"
                  min="0.1"
                />
                <p className="text-xs text-muted-foreground">Extract one frame every {interval} seconds</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Image Format</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="png">PNG (lossless)</SelectItem>
                  <SelectItem value="jpg">JPG (smaller file)</SelectItem>
                  <SelectItem value="webp">WebP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-background/50 rounded p-4 text-sm space-y-1">
            <p className="text-muted-foreground">Current timestamp: {formatTime(currentTime)}</p>
            <p className="text-muted-foreground">Estimated frames: {estimatedFrames()}</p>
          </div>

          <ProcessingButton config={getActionConfig()} />
        </div>
      </div>
    </div>
  )
}
