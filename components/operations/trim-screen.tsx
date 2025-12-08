"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Scissors, X } from "lucide-react"
import { useVideo } from "@/lib/video-context"

/**
 * Trim screen for cutting video segments.
 * Allows marking start/end points with visual timeline preview.
 */
export function TrimScreen() {
  const router = useRouter()
  const { videoData, setActionConfig } = useVideo()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [endTime, setEndTime] = useState<number | null>(null)
  const [thumbnails, setThumbnails] = useState<string[]>([])
  const [videoUrl, setVideoUrl] = useState<string>("")

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
      generateThumbnails(video)
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

  const generateThumbnails = async (video: HTMLVideoElement) => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = 160
    canvas.height = 90

    const thumbCount = 10
    const interval = video.duration / thumbCount
    const thumbs: string[] = []

    for (let i = 0; i < thumbCount; i++) {
      video.currentTime = i * interval
      await new Promise((resolve) => {
        video.onseeked = resolve
      })
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      thumbs.push(canvas.toDataURL())
    }

    setThumbnails(thumbs)
    video.currentTime = 0
  }

  const togglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !isMuted
    setIsMuted(!isMuted)
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

  const handleThumbnailClick = (index: number) => {
    if (!videoRef.current) return
    const time = (index / thumbnails.length) * duration
    videoRef.current.currentTime = time
    setCurrentTime(time)
  }

  const handleSplit = () => {
    if (startTime === null) {
      setStartTime(currentTime)
    } else if (endTime === null) {
      setEndTime(currentTime)
    }
  }

  const handleClearSelection = () => {
    setStartTime(null)
    setEndTime(null)
  }

  const handleContinue = () => {
    setActionConfig({
      type: "trim",
      params: {
        start: startTime !== null ? startTime.toFixed(2) : "0",
        end: endTime !== null ? endTime.toFixed(2) : duration.toFixed(2),
      },
    })
    router.push("/export")
  }

  if (!videoData) {
    router.push("/")
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
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleClearSelection} disabled={startTime === null && endTime === null}>
            Clear Selection
          </Button>
          <Button
            onClick={handleContinue}
            disabled={startTime === null || endTime === null}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            Continue to Export
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video ref={videoRef} src={videoUrl} className="w-full h-full object-contain" />
        </div>

        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" size="lg" className="w-12 h-12 rounded-full bg-transparent" onClick={togglePlay}>
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </Button>
          <Button variant="outline" size="lg" className="w-12 h-12 rounded-full bg-transparent" onClick={toggleMute}>
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </Button>
          <Button variant="outline" size="lg" className="gap-2 bg-transparent" onClick={handleSplit}>
            <Scissors className="w-4 h-4" />
            {startTime === null ? "Mark Start" : endTime === null ? "Mark End" : "Split"}
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

        {thumbnails.length > 0 && (
          <div className="relative">
            <div className="flex gap-1 overflow-x-auto pb-2">
              {thumbnails.map((thumb, index) => (
                <div
                  key={index}
                  className="relative flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => handleThumbnailClick(index)}
                >
                  <img
                    src={thumb || "/placeholder.svg"}
                    alt={`Frame ${index}`}
                    className="w-40 h-24 object-cover rounded border-2 border-border"
                  />
                </div>
              ))}
            </div>
            {startTime !== null && endTime !== null && (
              <div
                className="absolute top-0 h-24 border-2 border-yellow-500 rounded pointer-events-none"
                style={getSelectionStyle()}
              >
                <button
                  className="absolute -right-3 -top-3 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-background cursor-pointer pointer-events-auto"
                  onClick={handleClearSelection}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {(startTime !== null || endTime !== null) && (
          <div className="bg-secondary/50 rounded-lg p-4">
            <div className="text-sm space-y-1">
              <p className="text-muted-foreground">Selection:</p>
              <div className="flex gap-4">
                <span>Start: {startTime !== null ? formatTime(startTime) : "—"}</span>
                <span>End: {endTime !== null ? formatTime(endTime) : "—"}</span>
                {startTime !== null && endTime !== null && <span>Duration: {formatTime(endTime - startTime)}</span>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
