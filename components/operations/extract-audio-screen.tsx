"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Play, Pause, Volume2 } from "lucide-react"
import { useVideo, type ActionConfig } from "@/lib/video-context"
import { ProcessingButton } from "@/components/processing-button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

/**
 * Extract audio screen for pulling audio track from video.
 * Allows selecting output format and bitrate.
 */
export function ExtractAudioScreen() {
  const router = useRouter()
  const { videoData, setActionConfig } = useVideo()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [format, setFormat] = useState("mp3")
  const [bitrate, setBitrate] = useState("192k")
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

  const getActionConfig = (): ActionConfig => ({
    type: "extract-audio",
    params: { format, bitrate },
  })

  if (!videoData) {
    router.push("/")
    return null
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
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center space-y-3">
              <Volume2 className="w-16 h-16 mx-auto text-white/80" />
              <p className="text-white/80 text-sm">Audio will be extracted from this video</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <Button variant="outline" size="lg" className="w-12 h-12 rounded-full bg-transparent" onClick={togglePlay}>
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </Button>
        </div>

        <div className="bg-secondary/50 rounded-lg p-6 space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Audio Extraction Settings</h3>
            <p className="text-sm text-muted-foreground">Choose the audio format and quality for extraction</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Output Format</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mp3">MP3</SelectItem>
                  <SelectItem value="wav">WAV</SelectItem>
                  <SelectItem value="aac">AAC</SelectItem>
                  <SelectItem value="flac">FLAC (lossless)</SelectItem>
                  <SelectItem value="ogg">OGG</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Audio Bitrate</Label>
              <Select value={bitrate} onValueChange={setBitrate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="128k">128 kbps</SelectItem>
                  <SelectItem value="192k">192 kbps (recommended)</SelectItem>
                  <SelectItem value="256k">256 kbps</SelectItem>
                  <SelectItem value="320k">320 kbps (highest)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {videoData.duration && (
            <div className="bg-background/50 rounded p-4 text-sm">
              <p className="text-muted-foreground">
                Duration: {Math.floor(videoData.duration / 60)}:
                {Math.floor(videoData.duration % 60)
                  .toString()
                  .padStart(2, "0")}
              </p>
            </div>
          )}

          <ProcessingButton config={getActionConfig()} />
        </div>
      </div>
    </div>
  )
}
