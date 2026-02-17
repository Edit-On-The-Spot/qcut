"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Play, Pause, Upload } from "lucide-react"
import type { ActionConfig } from "@/lib/video-context"
import { useRequireVideo } from "@/lib/use-require-video"
import { VideoUploadPrompt } from "@/components/video-upload-prompt"
import { VideoLoading } from "@/components/video-loading"
import { ProcessingButton } from "@/components/processing-button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

/**
 * Overlay screen for adding image watermarks/overlays to video.
 * Supports position presets, custom offset, scale, and opacity.
 */
export function OverlayScreen() {
  const router = useRouter()
  const { videoData, isLoading, needsUpload } = useRequireVideo()
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string>("")
  const [overlayFile, setOverlayFile] = useState<File | null>(null)
  const [overlayPreview, setOverlayPreview] = useState<string>("")
  const [position, setPosition] = useState("top-left")
  const [offsetX, setOffsetX] = useState("10")
  const [offsetY, setOffsetY] = useState("10")
  const [scalePct, setScalePct] = useState([100])
  const [opacityPct, setOpacityPct] = useState([100])
  const [videoBox, setVideoBox] = useState({ width: 0, height: 0, offsetX: 0, offsetY: 0 })

  useEffect(() => {
    if (!videoData) return
    const url = URL.createObjectURL(videoData.file)
    setVideoUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [videoData])

  useEffect(() => {
    if (!overlayFile) {
      setOverlayPreview("")
      return
    }
    const url = URL.createObjectURL(overlayFile)
    setOverlayPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [overlayFile])

  const updateVideoBox = useCallback(() => {
    const container = containerRef.current
    const video = videoRef.current
    if (!container || !video || video.videoWidth === 0 || video.videoHeight === 0) return

    const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect()
    const videoRatio = video.videoWidth / video.videoHeight
    const containerRatio = containerWidth / containerHeight

    let width = containerWidth
    let height = containerHeight
    if (containerRatio > videoRatio) {
      height = containerHeight
      width = height * videoRatio
    } else {
      width = containerWidth
      height = width / videoRatio
    }

    const offsetXValue = (containerWidth - width) / 2
    const offsetYValue = (containerHeight - height) / 2
    setVideoBox({ width, height, offsetX: offsetXValue, offsetY: offsetYValue })
  }, [])

  useEffect(() => {
    updateVideoBox()
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(updateVideoBox)
    observer.observe(container)
    return () => observer.disconnect()
  }, [updateVideoBox])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const handleMetadata = () => updateVideoBox()
    video.addEventListener("loadedmetadata", handleMetadata)
    video.addEventListener("loadeddata", handleMetadata)
    return () => {
      video.removeEventListener("loadedmetadata", handleMetadata)
      video.removeEventListener("loadeddata", handleMetadata)
    }
  }, [updateVideoBox, videoUrl])

  const togglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleOverlayUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setOverlayFile(file)
    }
  }

  const getActionConfig = (): ActionConfig => ({
    type: "overlay",
    params: {
      overlayFile,
      position,
      offsetX: parseInt(offsetX) || 10,
      offsetY: parseInt(offsetY) || 10,
      scalePct: scalePct[0],
      opacityPct: opacityPct[0],
    },
  })

  const getOverlayPositionStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: "absolute",
      maxWidth: `${scalePct[0]}%`,
      maxHeight: `${scalePct[0]}%`,
      opacity: opacityPct[0] / 100,
      objectFit: "contain",
    }
    const xOffset = parseInt(offsetX) || 10
    const yOffset = parseInt(offsetY) || 10
    switch (position) {
      case "top-right":
        return { ...baseStyle, top: yOffset, right: xOffset }
      case "bottom-left":
        return { ...baseStyle, bottom: yOffset, left: xOffset }
      case "bottom-right":
        return { ...baseStyle, bottom: yOffset, right: xOffset }
      case "center":
        return { ...baseStyle, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
      default: // top-left
        return { ...baseStyle, top: yOffset, left: xOffset }
    }
  }

  const formatFileSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB"
  }

  if (needsUpload) {
    return <VideoUploadPrompt />
  }

  if (isLoading || !videoData) {
    return <VideoLoading />
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => router.push("/actions")}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <div className="space-y-4">
        <div ref={containerRef} className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video ref={videoRef} src={videoUrl} className="w-full h-full object-contain" />
          {overlayPreview && (
            <div
              className="absolute pointer-events-none"
              style={{
                top: videoBox.offsetY,
                left: videoBox.offsetX,
                width: videoBox.width,
                height: videoBox.height,
              }}
            >
              <img
                src={overlayPreview}
                alt="Overlay preview"
                style={getOverlayPositionStyle()}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-center">
          <Button variant="outline" size="lg" className="w-12 h-12 rounded-full bg-transparent" onClick={togglePlay}>
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </Button>
        </div>

        <div className="bg-secondary/50 rounded-lg p-6 space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Add Overlay</h3>
            <p className="text-sm text-muted-foreground">Add an image overlay or watermark to your video</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Overlay Image</Label>
              {overlayFile ? (
                <div className="bg-background rounded-lg p-4 border border-border">
                  <div className="flex items-center gap-4">
                    {overlayPreview && (
                      <img
                        src={overlayPreview}
                        alt="Overlay"
                        className="w-16 h-16 object-contain rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{overlayFile.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">{formatFileSize(overlayFile.size)}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-transparent"
                      onClick={() => setOverlayFile(null)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleOverlayUpload}
                    className="hidden"
                    id="overlay-upload"
                  />
                  <Button variant="outline" className="w-full bg-transparent" asChild>
                    <label htmlFor="overlay-upload" className="cursor-pointer">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Overlay Image
                    </label>
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">PNG recommended for transparency support</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Position</Label>
              <Select value={position} onValueChange={setPosition}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top-left">Top Left</SelectItem>
                  <SelectItem value="top-right">Top Right</SelectItem>
                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {position !== "center" && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>X Offset (pixels)</Label>
                  <Input
                    type="number"
                    value={offsetX}
                    onChange={(e) => setOffsetX(e.target.value)}
                    placeholder="10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Y Offset (pixels)</Label>
                  <Input
                    type="number"
                    value={offsetY}
                    onChange={(e) => setOffsetY(e.target.value)}
                    placeholder="10"
                  />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Scale</Label>
                <span className="text-sm text-muted-foreground">{scalePct[0]}%</span>
              </div>
              <Slider
                value={scalePct}
                onValueChange={setScalePct}
                min={10}
                max={100}
                step={5}
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Opacity</Label>
                <span className="text-sm text-muted-foreground">{opacityPct[0]}%</span>
              </div>
              <Slider
                value={opacityPct}
                onValueChange={setOpacityPct}
                min={10}
                max={100}
                step={5}
              />
            </div>
          </div>

          <div className="bg-background/50 rounded p-4 text-sm">
            <p className="text-muted-foreground">Re-encoding required: overlays change video frames.</p>
          </div>

          {overlayFile && <ProcessingButton config={getActionConfig()} onReset={() => setOverlayFile(null)} />}
        </div>
      </div>
    </div>
  )
}
