"use client"

import { useState } from "react"
import { Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ActionConfig } from "@/lib/video-context"
import { useRequireVideo } from "@/lib/use-require-video"
import { VideoUploadPrompt } from "@/components/video-upload-prompt"
import { useVideoUrl } from "@/lib/use-video-url"
import { ProcessingButton } from "@/components/processing-button"
import { VideoPreview } from "@/components/video-preview"
import { VideoLoading } from "@/components/video-loading"
import { BackButton } from "@/components/back-button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

/**
 * Extract audio/video screen for pulling audio track from video or removing audio (mute).
 * Supports extracting audio in multiple formats or extracting video without audio.
 */
export function ExtractAudioScreen() {
  const { videoData, isLoading, needsUpload } = useRequireVideo()
  const videoUrl = useVideoUrl(videoData?.file)
  const [extractMode, setExtractMode] = useState<"audio" | "video">("audio")
  const [format, setFormat] = useState("mp3")
  const [bitrate, setBitrate] = useState("192k")
  const [videoFormat, setVideoFormat] = useState("mp4")

  const getActionConfig = (): ActionConfig => ({
    type: "extract-audio",
    params: {
      extractMode,
      format,
      bitrate,
      videoFormat,
    },
  })

  if (needsUpload) {
    return <VideoUploadPrompt />
  }

  if (isLoading || !videoData) {
    return <VideoLoading />
  }

  const overlay = (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
      <div className="text-center space-y-3">
        {extractMode === "audio" ? (
          <>
            <Volume2 className="w-16 h-16 mx-auto text-white/80" />
            <p className="text-white/80 text-sm">Audio will be extracted from this video</p>
          </>
        ) : (
          <>
            <VolumeX className="w-16 h-16 mx-auto text-white/80" />
            <p className="text-white/80 text-sm">Audio will be removed from this video</p>
          </>
        )}
      </div>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <BackButton />

      <div className="space-y-4">
        <VideoPreview src={videoUrl} overlay={overlay} />

        <div className="bg-secondary/50 rounded-lg p-6 space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Extract Audio or Video</h3>
            <p className="text-sm text-muted-foreground">
              Extract the audio track, or remove audio to get a silent video
            </p>
          </div>

          <div className="space-y-2">
            <Label>Extraction Mode</Label>
            <div className="flex gap-2">
              <Button
                variant={extractMode === "audio" ? "default" : "outline"}
                className={extractMode !== "audio" ? "bg-transparent" : ""}
                onClick={() => setExtractMode("audio")}
              >
                <Volume2 className="w-4 h-4 mr-2" />
                Extract Audio
              </Button>
              <Button
                variant={extractMode === "video" ? "default" : "outline"}
                className={extractMode !== "video" ? "bg-transparent" : ""}
                onClick={() => setExtractMode("video")}
              >
                <VolumeX className="w-4 h-4 mr-2" />
                Remove Audio (Mute)
              </Button>
            </div>
          </div>

          {extractMode === "audio" ? (
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
          ) : (
            <div className="space-y-2">
              <Label>Video Format</Label>
              <Select value={videoFormat} onValueChange={setVideoFormat}>
                <SelectTrigger className="md:w-1/2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mp4">MP4</SelectItem>
                  <SelectItem value="webm">WebM</SelectItem>
                  <SelectItem value="mov">MOV</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                The video will be copied without re-encoding for fast processing
              </p>
            </div>
          )}

          {videoData!.duration && (
            <div className="bg-background/50 rounded p-4 text-sm">
              <p className="text-muted-foreground">
                Duration: {Math.floor(videoData!.duration / 60)}:
                {Math.floor(videoData!.duration % 60)
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
