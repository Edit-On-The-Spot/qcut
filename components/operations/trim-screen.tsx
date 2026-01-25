"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Scissors, X, Loader2 } from "lucide-react"
import type { ActionConfig } from "@/lib/video-context"
import { useRequireVideo } from "@/lib/use-require-video"
import { ProcessingButton } from "@/components/processing-button"
import { useVideoFramerate } from "@/lib/use-video-framerate"
import { useFFmpegThumbnails } from "@/lib/use-ffmpeg-thumbnails"
import { useThumbnailZoom } from "@/lib/use-thumbnail-zoom"
import { snapTimeToFrame, timeToFrame } from "@/lib/time-utils"
import { useMarkerDrag } from "@/lib/use-marker-drag"

/**
 * Trim screen for cutting video segments.
 * Allows marking start/end points with visual timeline preview.
 */
export function TrimScreen() {
  const router = useRouter()
  const { videoData, setActionConfig, isLoading } = useRequireVideo()
  const videoRef = useRef<HTMLVideoElement>(null)
  const thumbnailContainerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(0)
  const [videoUrl, setVideoUrl] = useState<string>("")
  const [containerWidthPx, setContainerWidthPx] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [draggingMarkerType, setDraggingMarkerType] = useState<"start" | "end" | null>(null)
  const [isPanning, setIsPanning] = useState(false)

  // Video framerate detection for zoom limits
  const framerateFps = useVideoFramerate(videoRef)

  // FFmpeg thumbnail generation with caching
  const { requestThumbnails, cancelPending, getThumbnails, isReady } = useFFmpegThumbnails(videoData)
  const prevZoomLevelRef = useRef(0)

  // Thumbnail zoom state and calculations
  const {
    zoomLevel,
    visibleStartSec,
    visibleDurationSec,
    timestamps,
    handleWheel,
    setZoomCenter,
    setVisibleRange
  } = useThumbnailZoom({
    durationSec: duration,
    framerateFps,
    containerWidthPx
  })

  const visibleEndSec = visibleStartSec + visibleDurationSec

  // Marker drag handlers for scrubber (full timeline 0-duration)
  const {
    handleStartMarkerMouseDown: handleScrubberStartDrag,
    handleEndMarkerMouseDown: handleScrubberEndDrag,
  } = useMarkerDrag({
    videoRef,
    framerate: framerateFps,
    duration,
    startTime,
    endTime,
    visibleStart: 0,
    visibleEnd: duration,
    containerWidth: containerWidthPx,
    onStartChange: (time) => {
      setStartTime(time)
    },
    onEndChange: (time) => {
      setEndTime(time)
    },
    onDragStateChange: (dragging, markerType) => {
      setIsDragging(dragging)
      setDraggingMarkerType(markerType)
    },
  })

  // Marker drag handlers for thumbnail strip (zoomed range)
  const {
    handleStartMarkerMouseDown: handleThumbnailStartDrag,
    handleEndMarkerMouseDown: handleThumbnailEndDrag,
  } = useMarkerDrag({
    videoRef,
    framerate: framerateFps,
    duration,
    startTime,
    endTime,
    visibleStart: visibleStartSec,
    visibleEnd: visibleEndSec,
    containerWidth: containerWidthPx,
    onStartChange: (time) => {
      setStartTime(time)
    },
    onEndChange: (time) => {
      setEndTime(time)
    },
    onDragStateChange: (dragging, markerType) => {
      setIsDragging(dragging)
      setDraggingMarkerType(markerType)
    },
  })

  // Get cached thumbnails for current timestamps
  const thumbnailMap = getThumbnails(timestamps)

  useEffect(() => {
    if (!videoData) return
    const url = URL.createObjectURL(videoData.file)
    setVideoUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [videoData])

  // Initialize endTime when duration is loaded
  useEffect(() => {
    if (duration > 0 && endTime === 0) {
      setEndTime(duration)
    }
  }, [duration, endTime])

  // Auto-scroll thumbnail strip during playback
  useEffect(() => {
    if (!isPlaying) return

    const checkAutoScroll = () => {
      if (currentTime < visibleStartSec || currentTime > visibleEndSec) {
        // Playhead is outside visible range, center it
        const percentage = currentTime / duration
        setZoomCenter(percentage)
      }
    }

    const interval = setInterval(checkAutoScroll, 100)
    return () => clearInterval(interval)
  }, [isPlaying, currentTime, visibleStartSec, visibleEndSec, duration, setZoomCenter])

  // Arrow key navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target !== document.body) return // Only handle when not in an input

      const panAmount = visibleDurationSec * 0.1 // 10% of visible range

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          const newStartLeft = Math.max(0, visibleStartSec - panAmount)
          setVisibleRange(newStartLeft, visibleDurationSec)
          break
        case 'ArrowRight':
          e.preventDefault()
          const newStartRight = Math.min(duration - visibleDurationSec, visibleStartSec + panAmount)
          setVisibleRange(newStartRight, visibleDurationSec)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [visibleStartSec, visibleDurationSec, duration, setVisibleRange])

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

  // Cancel pending thumbnails when zoom level changes to avoid generating
  // thumbnails that are no longer needed at the previous zoom level
  useEffect(() => {
    if (prevZoomLevelRef.current !== zoomLevel) {
      cancelPending()
      prevZoomLevelRef.current = zoomLevel
    }
  }, [zoomLevel, cancelPending])

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

  const snapTime = (timeSec: number) => snapTimeToFrame(timeSec, framerateFps, duration)

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const time = snapTime(percentage * duration)
    videoRef.current.currentTime = time
    setCurrentTime(time)

    // Only pan thumbnail strip if clicked position is not already visible
    if (time < visibleStartSec || time > visibleEndSec) {
      setZoomCenter(percentage)
    }
  }

  /**
   * Handles click on a thumbnail to seek to that timestamp.
   * @param timestampSec - The timestamp in seconds to seek to
   */
  const handleThumbnailClick = (timestampSec: number) => {
    if (!videoRef.current) return
    const time = snapTime(timestampSec)
    videoRef.current.currentTime = time
    setCurrentTime(time)
  }

  /**
   * Handles panning the thumbnail strip by dragging anywhere on it.
   */
  const handleThumbnailPanStart = (e: React.MouseEvent) => {
    // Don't pan if clicking on a marker (they have their own handlers)
    const target = e.target as HTMLElement
    if (target.classList.contains('cursor-ew-resize') || target.closest('.cursor-ew-resize')) {
      return
    }

    e.preventDefault()
    setIsPanning(true)

    const startX = e.clientX
    const startVisibleTime = visibleStartSec

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaTime = (deltaX / containerWidthPx) * visibleDurationSec

      let newVisibleStart = startVisibleTime - deltaTime

      // Constrain to video bounds
      newVisibleStart = Math.max(0, Math.min(newVisibleStart, duration - visibleDurationSec))

      setVisibleRange(newVisibleStart, visibleDurationSec)
    }

    const handleMouseUp = () => {
      setIsPanning(false)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  const handleClearSelection = () => {
    setStartTime(0)
    setEndTime(duration)
  }

  const getActionConfig = (): ActionConfig => ({
    type: "trim",
    params: {
      start: snapTime(startTime).toFixed(2),
      end: snapTime(endTime).toFixed(2),
    },
  })

  if (isLoading || !videoData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  /**
   * Formats time as M:SS for display on timeline and selection info.
   * @param seconds - Time in seconds
   * @returns Formatted string like "1:05"
   */
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  /**
   * Formats time with centisecond precision for thumbnail overlays.
   * Shows sub-second detail when thumbnails are close together during zoom.
   * @param seconds - Time in seconds
   * @returns Formatted string like "1:05.23" (23 centiseconds)
   */
  const formatTimeWithCentiseconds = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const centiseconds = Math.floor((seconds % 1) * 100)
    return `${mins}:${secs.toString().padStart(2, "0")}.${centiseconds.toString().padStart(2, "0")}`
  }

  /**
   * Calculates selection overlay style for the timeline.
   * Uses full video duration for positioning.
   */
  const getTimelineSelectionStyle = () => {
    if (duration <= 0) return {}
    const start = (startTime / duration) * 100
    const end = (endTime / duration) * 100
    return {
      left: `${Math.min(start, end)}%`,
      width: `${Math.abs(end - start)}%`,
    }
  }

  /**
   * Calculates selection overlay style for the thumbnail strip.
   * Accounts for the visible range when zoomed.
   */
  const getThumbnailSelectionStyle = () => {
    if (duration <= 0 || timestamps.length === 0) return {}

    const actualVisibleDuration = visibleDurationSec > 0 ? visibleDurationSec : duration

    if (actualVisibleDuration <= 0) return {}

    // Calculate relative positions within the visible range
    const relativeStart = Math.max(0, (startTime - visibleStartSec) / actualVisibleDuration)
    const relativeEnd = Math.min(1, (endTime - visibleStartSec) / actualVisibleDuration)

    if (relativeEnd <= 0 || relativeStart >= 1) {
      return { display: "none" } // Selection is outside visible range
    }

    return {
      left: `${Math.max(0, Math.min(relativeStart, relativeEnd)) * 100}%`,
      width: `${Math.abs(relativeEnd - relativeStart) * 100}%`,
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/actions")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button variant="outline" onClick={handleClearSelection}>
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
          <Button variant="outline" size="lg" className="gap-2 bg-transparent" onClick={() => {
            const time = snapTime(currentTime)
            setStartTime(time)
          }}>
            <Scissors className="w-4 h-4" />
            {startTime === 0 && endTime === duration ? "Mark Start" : "Update Start"}
          </Button>
          <Button variant="outline" size="lg" className="gap-2 bg-transparent" onClick={() => {
            const time = snapTime(currentTime)
            setEndTime(time)
          }}>
            <Scissors className="w-4 h-4" />
            {startTime === 0 && endTime === duration ? "Mark End" : "Update End"}
          </Button>
        </div>

        <div className="space-y-2">
          <div className="relative h-1.5 bg-secondary rounded-full cursor-pointer group" onClick={handleTimelineClick}>
            {/* Progress bar (behind viewport indicator) */}
            <div
              className="absolute top-0 left-0 h-full bg-accent rounded-full transition-all z-0"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
            {/* Viewport indicator showing visible thumbnail range */}
            {zoomLevel > 0.01 && duration > 0 && visibleDurationSec < duration && (
              <div
                className="absolute top-0 h-full bg-blue-500/20 border border-blue-500 rounded-full pointer-events-none z-5"
                style={{
                  left: `${Math.max(0, Math.min(100, (visibleStartSec / duration) * 100))}%`,
                  width: `${Math.max(0, Math.min(100, (visibleDurationSec / duration) * 100))}%`,
                }}
              />
            )}
            {/* Selection overlay */}
            <div className="absolute top-0 h-full border-2 border-dashed border-yellow-400 opacity-50 rounded-full z-5" style={getTimelineSelectionStyle()} />
            {/* Current time indicator */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-accent rounded-full shadow-lg transition-all z-10"
              style={{ left: `${(currentTime / duration) * 100}%`, marginLeft: "-0.5rem" }}
            />
            {/* Start marker (green, draggable) */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-4 h-6 bg-green-500 border-2 border-white rounded shadow-lg cursor-ew-resize hover:scale-110 transition-transform z-20 ${
                isDragging && draggingMarkerType === "start" ? "scale-125" : ""
              }`}
              style={{ left: `${(startTime / duration) * 100}%`, marginLeft: "-0.5rem" }}
              onMouseDown={handleScrubberStartDrag}
              title={`Start: ${formatTime(startTime)}`}
            >
              <div className="absolute inset-0 flex items-center justify-center text-[8px] text-white font-bold">S</div>
            </div>
            {/* End marker (red, draggable) */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-4 h-6 bg-red-500 border-2 border-white rounded shadow-lg cursor-ew-resize hover:scale-110 transition-transform z-20 ${
                isDragging && draggingMarkerType === "end" ? "scale-125" : ""
              }`}
              style={{ left: `${(endTime / duration) * 100}%`, marginLeft: "-0.5rem" }}
              onMouseDown={handleScrubberEndDrag}
              title={`End: ${formatTime(endTime)}`}
            >
              <div className="absolute inset-0 flex items-center justify-center text-[8px] text-white font-bold">E</div>
            </div>
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
            className={`flex gap-1 pb-2 ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
            onMouseDown={handleThumbnailPanStart}
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
                  {/* Timestamp overlay */}
                  <span className="absolute bottom-1 left-1 px-1 py-0.5 text-xs bg-black/70 text-white rounded">
                    {formatTimeWithCentiseconds(timestamp)}
                  </span>
                </div>
              )
            })}
          </div>
          {/* Selection overlay on thumbnail strip - no side borders */}
          <div
            className="absolute top-0 h-24 border-t-2 border-b-2 border-dashed border-yellow-400 bg-yellow-500/20 pointer-events-none"
            style={getThumbnailSelectionStyle()}
          />
          {/* Start marker on thumbnail strip (green, draggable) */}
          {duration > 0 && startTime >= visibleStartSec && startTime <= visibleEndSec && (
            <div
              className={`absolute top-0 w-4 h-24 bg-green-500 border-2 border-white shadow-lg cursor-ew-resize hover:scale-110 transition-transform z-30 ${
                isDragging && draggingMarkerType === "start" ? "scale-125" : ""
              }`}
              style={{
                left: `${((startTime - visibleStartSec) / (visibleDurationSec || duration)) * 100}%`,
                marginLeft: "-0.5rem"
              }}
              onMouseDown={handleThumbnailStartDrag}
              title={`Start: ${formatTime(startTime)}`}
            >
              <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold">S</div>
            </div>
          )}
          {/* End marker on thumbnail strip (red, draggable) */}
          {duration > 0 && endTime >= visibleStartSec && endTime <= visibleEndSec && (
            <div
              className={`absolute top-0 w-4 h-24 bg-red-500 border-2 border-white shadow-lg cursor-ew-resize hover:scale-110 transition-transform z-30 ${
                isDragging && draggingMarkerType === "end" ? "scale-125" : ""
              }`}
              style={{
                left: `${((endTime - visibleStartSec) / (visibleDurationSec || duration)) * 100}%`,
                marginLeft: "-0.5rem"
              }}
              onMouseDown={handleThumbnailEndDrag}
              title={`End: ${formatTime(endTime)}`}
            >
              <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold">E</div>
            </div>
          )}
        </div>

        {duration > 0 && (
          <div className="bg-secondary/50 rounded-lg p-4">
            <div className="text-sm space-y-1">
              <p className="text-muted-foreground">Selection:</p>
              <div className="flex gap-4">
                <span>Start: {formatTime(startTime)}</span>
                <span>End: {formatTime(endTime)}</span>
                <span>Duration: {formatTime(Math.abs(endTime - startTime))}</span>
              </div>
              {startTime === endTime && (
                <p className="text-yellow-600 text-xs mt-2">⚠ Single frame selected</p>
              )}
            </div>
          </div>
        )}

        {duration > 0 && (
          <ProcessingButton
            config={getActionConfig()}
            onReset={handleClearSelection}
          />
        )}
      </div>
    </div>
  )
}
