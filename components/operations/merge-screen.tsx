"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Upload } from "lucide-react"
import { useVideo, type ActionConfig } from "@/lib/video-context"
import { ProcessingButton } from "@/components/processing-button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

/**
 * Merge screen for combining audio with video.
 * Allows uploading a separate audio file to merge with the video.
 */
export function MergeScreen() {
  const router = useRouter()
  const { videoData, setActionConfig } = useVideo()
  const [audioFile, setAudioFile] = useState<File | null>(null)

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAudioFile(file)
    }
  }

  const getActionConfig = (): ActionConfig => ({
    type: "merge",
    params: {
      videoFile: videoData?.file.name,
      audioFile: audioFile?.name,
    },
  })

  if (!videoData) {
    router.push("/")
    return null
  }

  const formatFileSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB"
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => router.push("/actions")}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <div className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-2xl font-semibold">Merge Audio with Video</h3>
          <p className="text-muted-foreground">Combine your video file with a separate audio track</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-secondary/50 rounded-lg p-6 space-y-4">
            <div className="space-y-2">
              <Label>Video File</Label>
              <div className="bg-background rounded-lg p-4 border border-border">
                <p className="font-medium truncate">{videoData.file.name}</p>
                <p className="text-sm text-muted-foreground mt-1">{formatFileSize(videoData.file.size)}</p>
                {videoData.duration && (
                  <p className="text-sm text-muted-foreground">
                    Duration: {Math.floor(videoData.duration / 60)}:
                    {Math.floor(videoData.duration % 60)
                      .toString()
                      .padStart(2, "0")}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-secondary/50 rounded-lg p-6 space-y-4">
            <div className="space-y-2">
              <Label>Audio File</Label>
              {audioFile ? (
                <div className="bg-background rounded-lg p-4 border border-border">
                  <p className="font-medium truncate">{audioFile.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">{formatFileSize(audioFile.size)}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 bg-transparent"
                    onClick={() => setAudioFile(null)}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div>
                  <Input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioUpload}
                    className="hidden"
                    id="audio-upload"
                  />
                  <Button variant="outline" className="w-full bg-transparent" asChild>
                    <label htmlFor="audio-upload" className="cursor-pointer">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Audio File
                    </label>
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">MP3, WAV, AAC, or other audio formats</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-background/50 border border-border rounded-lg p-4 text-sm">
          <p className="text-muted-foreground">
            The audio will replace any existing audio in the video. If the audio is longer or shorter than the video, it
            will be trimmed or extended accordingly.
          </p>
        </div>

        {audioFile && <ProcessingButton config={getActionConfig()} onReset={() => setAudioFile(null)} />}
      </div>
    </div>
  )
}
