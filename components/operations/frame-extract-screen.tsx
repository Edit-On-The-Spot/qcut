"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Play, Pause } from "lucide-react"
import type { VideoData, ActionConfig } from "@/app/page"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

interface FrameExtractScreenProps {
  videoData: VideoData
  onComplete: (config: ActionConfig) => void
  onBack: () => void
}

export function FrameExtractScreen({ videoData, onComplete, onBack }: FrameExtractScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [extractMode, setExtractMode] = useState("interval")
  const [interval, setInterval] = useState("1")
  const [format, setFormat] = useState("png")
  const [videoUrl, setVideoUrl] = useState<string>("")

  useEffect(() => {
    const url = URL.createObjectURL(videoData.file)
    setVideoUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [videoData.file])

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

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const time = percentage * duration
    videoRef.current.currentTime = time
    setCurrentTime(time)
  }

  const extractCurrentFrame = () => {
    onComplete({
      type: "frame-extract",
      params: {
        mode: "current",
        timestamp: currentTime.toFixed(2),
        format,
      },
    })
  }

  const handleContinue = () => {
    onComplete({
      type: "frame-extract",
      params: {
        mode: extractMode,
        interval: extractMode === "interval" ? interval : undefined,
        format,
      },
    })
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
    return "—"
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleContinue} className="bg-accent text-accent-foreground hover:bg-accent/90">
          Continue to Export
        </Button>
      </div>

      <div className="space-y-4">
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video ref={videoRef} src={videoUrl} className="w-full h-full object-contain" />
        </div>

        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" size="lg" className="w-12 h-12 rounded-full bg-transparent" onClick={togglePlay}>
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </Button>
          <Button variant="outline" size="lg" onClick={extractCurrentFrame}>
            Extract Current Frame
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
                  <SelectItem value="interval">Every N seconds</SelectItem>
                  <SelectItem value="all">All frames</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {extractMode === "interval" && (
              <div className="space-y-2">
                <Label>Interval (seconds)</Label>
                <Input
                  type="number"
                  value={interval}
                  onChange={(e) => setInterval(e.target.value)}
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
        </div>
      </div>
    </div>
  )
}
