"use client"

import { useState, useEffect } from "react"
import { Terminal, Download, RotateCcw, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { ActionConfig, VideoData } from "@/app/page"

interface ExportScreenProps {
  videoData: VideoData
  actionConfig: ActionConfig
  onReset: () => void
}

export function ExportScreen({ videoData, actionConfig, onReset }: ExportScreenProps) {
  const [command, setCommand] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [progress, setProgress] = useState(0)
  const [outputUrl, setOutputUrl] = useState<string | null>(null)

  useEffect(() => {
    // Generate FFmpeg command based on action
    const cmd = generateFFmpegCommand(videoData, actionConfig)
    setCommand(cmd)
  }, [videoData, actionConfig])

  const generateFFmpegCommand = (video: VideoData, config: ActionConfig): string => {
    const inputFile = video.file.name
    let cmd = `ffmpeg -i ${inputFile}`

    switch (config.type) {
      case "convert":
        cmd += ` -c:v libx264 -c:a aac output.${config.params.format || "mp4"}`
        break
      case "compress":
        cmd += ` -vcodec libx264 -crf ${config.params.crf || "23"} output.mp4`
        break
      case "trim":
        cmd += ` -ss ${config.params.start || "0"} -to ${config.params.end || video.duration} -c copy output.mp4`
        break
      case "extract-audio":
        cmd += ` -vn -acodec ${config.params.format === "mp3" ? "libmp3lame" : "copy"} output.${config.params.format || "mp3"}`
        break
      case "gif":
        cmd += ` -vf "fps=${config.params.fps || "10"},scale=${config.params.width || "480"}:-1:flags=lanczos" output.gif`
        break
      case "resize":
        cmd += ` -vf scale=${config.params.width || "-1"}:${config.params.height || "-1"} output.mp4`
        break
      case "frame-extract":
        cmd += ` -vf fps=${config.params.fps || "1"} frame_%04d.${config.params.format || "png"}`
        break
      case "merge":
        cmd = `ffmpeg -i video.mp4 -i audio.${config.params.format || "mp3"} -c:v copy -c:a aac output.mp4`
        break
      case "combine":
        cmd = `ffmpeg -f concat -safe 0 -i filelist.txt -c copy output.mp4`
        break
      default:
        cmd += " output.mp4"
    }

    return cmd
  }

  const handleProcess = async () => {
    setIsProcessing(true)
    setProgress(0)

    // Simulate processing with progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval)
          return 95
        }
        return prev + Math.random() * 15
      })
    }, 300)

    // Simulate processing (in real implementation, this would use FFmpeg.wasm)
    setTimeout(() => {
      clearInterval(interval)
      setProgress(100)
      setIsProcessing(false)
      setIsComplete(true)
      // In real implementation, this would be the actual output file
      setOutputUrl(URL.createObjectURL(videoData.file))
    }, 3000)
  }

  const handleDownload = () => {
    if (outputUrl) {
      const a = document.createElement("a")
      a.href = outputUrl
      a.download = `output_${actionConfig.type}.mp4`
      a.click()
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Export</h2>
        <p className="text-muted-foreground">Review and execute the FFmpeg command</p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Terminal className="w-4 h-4" />
          <span className="font-medium">FFmpeg Command</span>
        </div>
        <div className="bg-secondary rounded-lg p-4">
          <code className="text-sm font-mono text-foreground break-all">{command}</code>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="font-semibold">Processing</h3>

        {!isProcessing && !isComplete && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Click the button below to start processing your video.</p>
            <Button onClick={handleProcess} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              Start Processing
            </Button>
          </div>
        )}

        {isProcessing && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-accent" />
              <span className="text-sm">Processing video...</span>
            </div>
            <div className="space-y-2">
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-accent transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground text-right">{Math.round(progress)}%</p>
            </div>
          </div>
        )}

        {isComplete && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-accent">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">Processing complete!</span>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleDownload} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button onClick={onReset} variant="outline" className="flex-1 bg-transparent">
                <RotateCcw className="w-4 h-4 mr-2" />
                Start Over
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
