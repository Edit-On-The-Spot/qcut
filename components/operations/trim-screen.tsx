"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Scissors, X, Loader2 } from "lucide-react"
import { useVideo, type ActionConfig } from "@/lib/video-context"
import { ProcessingButton } from "@/components/processing-button"
import { useVideoFramerate } from "@/lib/use-video-framerate"
import { useFFmpegThumbnails } from "@/lib/use-ffmpeg-thumbnails"
import { useThumbnailZoom } from "@/lib/use-thumbnail-zoom"

/**
 * Trim screen for cutting video segments.
 * Allows marking start/end points with visual timeline preview.
 */
export function TrimScreen() {
  const router = useRouter()
  const { videoData, setActionConfig } = useVideo()
  const videoRef = useRef<HTMLVideoElement>(null)
  const thumbnailContainerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [endTime, setEndTime] = useState<number | null>(null)
  const [videoUrl, setVideoUrl] = useState<string>("")
  const [containerWidthPx, setContainerWidthPx] = useState(0)

  // Video framerate detection for zoom limits
  const framerateFps = useVideoFramerate(videoRef)

  // FFmpeg thumbnail generation with caching
  const { requestThumbnails, getThumbnails, isReady } = useFFmpegThumbnails(videoData)

  // Thumbnail zoom state and calculations
  const {
    zoomLevel,
    visibleStartSec,
    timestamps,
    handleWheel
  } = useThumbnailZoom({
    durationSec: duration,
    framerateFps,
    containerWidthPx
  })

  // Get cached thumbnails for current timestamps
  const thumbnailMap = getThumbnails(timestamps)

  useEffect(() => {
    if (!videoData) return
    const url = URL.createObjectURL(videoData.file)
    setVideoUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [videoData])

  // Measure container width for zoom calculations and attach non-passive wheel listener
  useEffect(() => {
    const container = thumbnailContainerRef.current
    if (!container) return

    const updateWidth = () => {
      setContainerWidthPx(container.offsetWidth)
    }

    updateWidth()

    const resizeObserver = new ResizeObserver(updateWidth)
    resizeObserver.observe(container)

    // Attach non-passive wheel listener to allow preventDefault
    container.addEventListener("wheel", handleWheel, { passive: false })

    return () => {
      resizeObserver.disconnect()
      container.removeEventListener("wheel", handleWheel)
    }
  }, [handleWheel])

  // Request thumbnails when timestamps change
  useEffect(() => {
    if (isReady && timestamps.length > 0) {
      requestThumbnails(timestamps)
    }
  }, [isReady, timestamps, requestThumbnails])

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

  /**
   * Handles click on a thumbnail to seek to that timestamp.
   * @param timestampSec - The timestamp in seconds to seek to
   */
  const handleThumbnailClick = (timestampSec: number) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = timestampSec
    setCurrentTime(timestampSec)
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

  const getActionConfig = (): ActionConfig => ({
    type: "trim",
    params: {
      start: startTime !== null ? startTime.toFixed(2) : "0",
      end: endTime !== null ? endTime.toFixed(2) : duration.toFixed(2),
    },
  })

  if (!videoData) {
    router.push("/")
    return null
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  /**
   * Calculates selection overlay style for the timeline.
   * Uses full video duration for positioning.
   */
  const getTimelineSelectionStyle = () => {
    if (startTime === null || endTime === null) return {}
    const start = (startTime / duration) * 100
    const end = (endTime / duration) * 100
    return {
      left: `${start}%`,
      width: `${end - start}%`,
    }
  }

  /**
   * Calculates selection overlay style for the thumbnail strip.
   * Accounts for the visible range when zoomed.
   */
  const getThumbnailSelectionStyle = () => {
    if (startTime === null || endTime === null || timestamps.length === 0) return {}

    const visibleEndSec = visibleStartSec + (timestamps.length - 1) * (timestamps.length > 1 ? timestamps[1] - timestamps[0] : duration)
    const visibleDuration = visibleEndSec - visibleStartSec

    if (visibleDuration <= 0) return {}

    // Calculate relative positions within the visible range
    const relativeStart = Math.max(0, (startTime - visibleStartSec) / visibleDuration)
    const relativeEnd = Math.min(1, (endTime - visibleStartSec) / visibleDuration)

    if (relativeEnd <= 0 || relativeStart >= 1) {
      return { display: "none" } // Selection is outside visible range
    }

    return {
      left: `${Math.max(0, relativeStart) * 100}%`,
      width: `${(Math.min(1, relativeEnd) - Math.max(0, relativeStart)) * 100}%`,
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
              <div className="absolute top-0 h-full bg-yellow-500/30 rounded-full" style={getTimelineSelectionStyle()} />
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

        {/* Thumbnail strip with zoom support */}
        <div className="relative">
          <div
            ref={thumbnailContainerRef}
            className="flex gap-1 pb-2"
          >
            {timestamps.map((timestamp) => {
              const thumb = thumbnailMap.get(timestamp)
              const isLoading = !thumb
              return (
                <div
                  key={timestamp}
                  className="relative flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => handleThumbnailClick(timestamp)}
                >
                  {isLoading ? (
                    <div className="w-40 h-24 bg-secondary rounded border-2 border-border flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <img
                      src={thumb}
                      alt={`Frame at ${formatTime(timestamp)}`}
                      className="w-40 h-24 object-cover rounded border-2 border-border"
                    />
                  )}
                </div>
              )
            })}
          </div>
          {startTime !== null && endTime !== null && (
            <div
              className="absolute top-0 h-24 border-2 border-yellow-500 rounded pointer-events-none"
              style={getThumbnailSelectionStyle()}
            >
              <button
                className="absolute -right-3 -top-3 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-background cursor-pointer pointer-events-auto"
                onClick={handleClearSelection}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {/* Zoom indicator */}
          {zoomLevel > 0 && (
            <div className="absolute bottom-0 right-0 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
              Zoom: {Math.round(zoomLevel * 100)}%
            </div>
          )}
        </div>

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

        {startTime !== null && endTime !== null && (
          <ProcessingButton
            config={getActionConfig()}
            onReset={handleClearSelection}
          />
        )}
      </div>
    </div>
  )
}
