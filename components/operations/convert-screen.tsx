"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Play, Pause } from "lucide-react"
import type { VideoData, ActionConfig } from "@/app/page"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ConvertScreenProps {
  videoData: VideoData
  onComplete: (config: ActionConfig) => void
  onBack: () => void
}

export function ConvertScreen({ videoData, onComplete, onBack }: ConvertScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [format, setFormat] = useState("mp4")
  const [codec, setCodec] = useState("libx264")
  const [videoUrl, setVideoUrl] = useState<string>("")

  useEffect(() => {
    const url = URL.createObjectURL(videoData.file)
    setVideoUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [videoData.file])

  const togglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleContinue = () => {
    onComplete({
      type: "convert",
      params: { format, codec },
    })
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
                  <SelectItem value="libx264">H.264 (libx264)</SelectItem>
                  <SelectItem value="libx265">H.265 (libx265)</SelectItem>
                  <SelectItem value="libvpx-vp9">VP9 (libvpx-vp9)</SelectItem>
                  <SelectItem value="copy">Copy (no re-encode)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-background/50 rounded p-4 text-sm space-y-1">
            <p className="text-muted-foreground">Current format: {videoData.format || "Unknown"}</p>
            <p className="text-muted-foreground">Current codec: {videoData.codec || "Unknown"}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
