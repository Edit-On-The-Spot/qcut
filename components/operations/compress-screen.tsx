"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Play, Pause } from "lucide-react"
import { useVideo, type ActionConfig } from "@/lib/video-context"
import { ProcessingButton } from "@/components/processing-button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

/**
 * Compress screen for reducing video file size.
 * Allows adjusting quality (CRF) and encoding preset.
 */
export function CompressScreen() {
  const router = useRouter()
  const { videoData, setActionConfig } = useVideo()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [quality, setQuality] = useState([28])
  const [preset, setPreset] = useState("medium")
  const [videoUrl, setVideoUrl] = useState<string>("")

  useEffect(() => {
    if (!videoData) return
    const url = URL.createObjectURL(videoData.file)
    setVideoUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [videoData])

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
    type: "compress",
    params: { crf: quality[0], preset },
  })

  if (!videoData) {
    return null
  }

  const estimatedSize = () => {
    const fileSizeMB = videoData.file.size / (1024 * 1024)
    const compressionFactor = quality[0] / 51
    return (fileSizeMB * compressionFactor).toFixed(2)
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
            <h3 className="text-lg font-semibold">Compression Settings</h3>
            <p className="text-sm text-muted-foreground">Adjust quality and speed settings to compress your video</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Quality (CRF)</Label>
                <span className="text-sm text-muted-foreground">{quality[0]}</span>
              </div>
              <Slider value={quality} onValueChange={setQuality} min={0} max={51} step={1} className="w-full" />
              <p className="text-xs text-muted-foreground">Lower = better quality, larger file (18-28 recommended)</p>
            </div>

            <div className="space-y-2">
              <Label>Encoding Preset</Label>
              <Select value={preset} onValueChange={setPreset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ultrafast">Ultra Fast (largest file)</SelectItem>
                  <SelectItem value="fast">Fast</SelectItem>
                  <SelectItem value="medium">Medium (balanced)</SelectItem>
                  <SelectItem value="slow">Slow</SelectItem>
                  <SelectItem value="veryslow">Very Slow (smallest file)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Slower presets = better compression, longer processing</p>
            </div>
          </div>

          <div className="bg-background/50 rounded p-4 text-sm space-y-1">
            <p className="text-muted-foreground">
              Original size: {(videoData.file.size / (1024 * 1024)).toFixed(2)} MB
            </p>
            <p className="text-muted-foreground">Estimated size: ~{estimatedSize()} MB</p>
            <p className="text-muted-foreground">Re-encoding required: compression changes video bitrate.</p>
          </div>

          <ProcessingButton config={getActionConfig()} />
        </div>
      </div>
    </div>
  )
}
