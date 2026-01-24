"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Play, Pause } from "lucide-react"
import { useVideo, type ActionConfig } from "@/lib/video-context"
import { ProcessingButton } from "@/components/processing-button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { useVideoFramerate } from "@/lib/use-video-framerate"
import { snapTimeToFrame } from "@/lib/time-utils"

/**
 * GIF screen for converting video segment to animated GIF.
 * Allows selecting time range and adjusting FPS/scale.
 */
export function GifScreen() {
  const router = useRouter()
  const { videoData, setActionConfig } = useVideo()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [endTime, setEndTime] = useState<number | null>(null)
  const [fps, setFps] = useState([10])
  const [scale, setScale] = useState([480])
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

  const markStart = () => {
    const time = snapTime(currentTime)
    setStartTime(time)
    if (endTime === null) {
      setEndTime(Math.min(time + 3, duration))
    }
  }

  const markEnd = () => {
    setEndTime(snapTime(currentTime))
  }

  const handleClearSelection = () => {
    setStartTime(null)
    setEndTime(null)
  }

  // Redirect to home if no video is loaded
  useEffect(() => {
    if (!videoData) {
      router.push("/")
    }
  }, [videoData, router])

  const getActionConfig = (): ActionConfig => ({
    type: "gif",
    params: {
      start: startTime !== null ? snapTime(startTime).toFixed(2) : "0",
      end: endTime !== null ? snapTime(endTime).toFixed(2) : Math.min(duration, 3).toFixed(2),
      fps: fps[0],
      scale: scale[0],
    },
  })

  if (!videoData) {
    return null
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getSelectionStyle = () => {
    if (startTime === null || endTime === null) return {}
    const start = (startTime / duration) * 100
    const end = (endTime / duration) * 100
    return {
      left: `${start}%`,
      width: `${end - start}%`,
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/actions")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button variant="outline" onClick={handleClearSelection} disabled={startTime === null && endTime === null}>
          Clear Selection
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
          <Button variant="outline" size="lg" onClick={markStart}>
            Mark Start
          </Button>
          <Button variant="outline" size="lg" onClick={markEnd}>
            Mark End
          </Button>
        </div>

        <div className="space-y-2">
          <div className="relative h-1.5 bg-secondary rounded-full cursor-pointer group" onClick={handleTimelineClick}>
            <div
              className="absolute top-0 left-0 h-full bg-accent rounded-full transition-all"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
            {startTime !== null && endTime !== null && (
              <div className="absolute top-0 h-full bg-yellow-500/30 rounded-full" style={getSelectionStyle()} />
            )}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-accent rounded-full shadow-lg transition-all"
              style={{ left: `${(currentTime / duration) * 100}%`, marginLeft: "-0.5rem" }}
            />
            {startTime !== null && (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-yellow-500 rounded-full shadow-lg"
                style={{ left: `${(startTime / duration) * 100}%`, marginLeft: "-0.375rem" }}
              />
            )}
            {endTime !== null && (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-yellow-500 rounded-full shadow-lg"
                style={{ left: `${(endTime / duration) * 100}%`, marginLeft: "-0.375rem" }}
              />
            )}
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="bg-secondary/50 rounded-lg p-6 space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">GIF Settings</h3>
            <p className="text-sm text-muted-foreground">Select a portion of video and adjust GIF quality settings</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Frame Rate (FPS)</Label>
                <span className="text-sm text-muted-foreground">{fps[0]} fps</span>
              </div>
              <Slider value={fps} onValueChange={setFps} min={5} max={30} step={5} className="w-full" />
              <p className="text-xs text-muted-foreground">Lower FPS = smaller file size</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Width (pixels)</Label>
                <span className="text-sm text-muted-foreground">{scale[0]}px</span>
              </div>
              <Slider value={scale} onValueChange={setScale} min={240} max={1080} step={120} className="w-full" />
              <p className="text-xs text-muted-foreground">Smaller dimensions = smaller file size</p>
            </div>
          </div>

          {(startTime !== null || endTime !== null) && (
            <div className="bg-background/50 rounded p-4 text-sm space-y-1">
              <p className="text-muted-foreground">Start: {startTime !== null ? formatTime(startTime) : "—"}</p>
              <p className="text-muted-foreground">End: {endTime !== null ? formatTime(endTime) : "—"}</p>
              {startTime !== null && endTime !== null && (
                <p className="text-muted-foreground">Duration: {formatTime(endTime - startTime)}</p>
              )}
              <p className="text-muted-foreground">Re-encoding required: GIF export rebuilds frames.</p>
            </div>
          )}

          <ProcessingButton config={getActionConfig()} onReset={handleClearSelection} />
        </div>
      </div>
    </div>
  )
}
