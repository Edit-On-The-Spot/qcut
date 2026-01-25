"use client"

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react"
import { Button } from "@/components/ui/button"
import { Play, Pause } from "lucide-react"

export interface VideoPreviewHandle {
  /** The video element for direct manipulation */
  video: HTMLVideoElement | null
  /** Seek to a specific time */
  seekTo: (timeSec: number) => void
  /** Play the video */
  play: () => void
  /** Pause the video */
  pause: () => void
  /** Toggle play/pause state */
  togglePlay: () => void
}

interface VideoPreviewProps {
  /** URL for the video source */
  src: string
  /** Show play/pause controls. Default: true */
  showControls?: boolean
  /** Called when video metadata is loaded */
  onLoadedMetadata?: (duration: number, width: number, height: number) => void
  /** Called on time update */
  onTimeUpdate?: (currentTime: number) => void
  /** Called when play state changes */
  onPlayStateChange?: (isPlaying: boolean) => void
  /** Additional class name for the container */
  className?: string
  /** Custom inline style for the video element (e.g., for rotation transforms) */
  videoStyle?: React.CSSProperties
  /** Custom class name for the video element */
  videoClassName?: string
  /** Optional overlay content rendered on top of the video */
  overlay?: React.ReactNode
}

/**
 * Reusable video preview component with play/pause controls.
 * Forwards a handle for programmatic video control.
 */
export const VideoPreview = forwardRef<VideoPreviewHandle, VideoPreviewProps>(
  function VideoPreview(
    {
      src,
      showControls = true,
      onLoadedMetadata,
      onTimeUpdate,
      onPlayStateChange,
      className,
      videoStyle,
      videoClassName,
      overlay,
    },
    ref
  ) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)

    useImperativeHandle(ref, () => ({
      video: videoRef.current,
      seekTo: (timeSec: number) => {
        if (videoRef.current) {
          videoRef.current.currentTime = timeSec
        }
      },
      play: () => {
        videoRef.current?.play()
      },
      pause: () => {
        videoRef.current?.pause()
      },
      togglePlay: () => {
        if (!videoRef.current) return
        if (isPlaying) {
          videoRef.current.pause()
        } else {
          videoRef.current.play()
        }
      },
    }))

    const togglePlay = () => {
      if (!videoRef.current) return
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
    }

    useEffect(() => {
      const video = videoRef.current
      if (!video) return

      const handleLoadedMetadata = () => {
        onLoadedMetadata?.(video.duration, video.videoWidth, video.videoHeight)
      }

      const handleTimeUpdate = () => {
        onTimeUpdate?.(video.currentTime)
      }

      const handlePlay = () => {
        setIsPlaying(true)
        onPlayStateChange?.(true)
      }

      const handlePause = () => {
        setIsPlaying(false)
        onPlayStateChange?.(false)
      }

      video.addEventListener("loadedmetadata", handleLoadedMetadata)
      video.addEventListener("timeupdate", handleTimeUpdate)
      video.addEventListener("play", handlePlay)
      video.addEventListener("pause", handlePause)

      return () => {
        video.removeEventListener("loadedmetadata", handleLoadedMetadata)
        video.removeEventListener("timeupdate", handleTimeUpdate)
        video.removeEventListener("play", handlePlay)
        video.removeEventListener("pause", handlePause)
      }
    }, [src, onLoadedMetadata, onTimeUpdate, onPlayStateChange])

    return (
      <div className={`space-y-4 ${className || ""}`}>
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            src={src}
            className={`w-full h-full object-contain ${videoClassName || ""}`}
            style={videoStyle}
          />
          {overlay}
        </div>

        {showControls && (
          <div className="flex items-center justify-center">
            <Button
              variant="outline"
              size="lg"
              className="w-12 h-12 rounded-full bg-transparent"
              onClick={togglePlay}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </Button>
          </div>
        )}
      </div>
    )
  }
)
