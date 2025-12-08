"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Terminal, Download, RotateCcw, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useVideo, useFFmpeg, type ActionConfig, type VideoData } from "@/lib/video-context"

/**
 * Export screen for processing video with FFmpeg.
 * Shows FFmpeg command, handles processing, and provides download.
 */
export function ExportScreen() {
  const router = useRouter()
  const { videoData, actionConfig, reset } = useVideo()
  const { ffmpeg, isLoaded, message: ffmpegMessage } = useFFmpeg()
  const [command, setCommand] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [progress, setProgress] = useState(0)
  const [outputUrl, setOutputUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (videoData && actionConfig) {
      const cmd = generateFFmpegCommand(videoData, actionConfig)
      setCommand(cmd)
    }
  }, [videoData, actionConfig])

  if (!videoData || !actionConfig) {
    router.push("/")
    return null
  }

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

  const getOutputExtension = (): string => {
    switch (actionConfig.type) {
      case "convert":
        return actionConfig.params.format || "mp4"
      case "extract-audio":
        return actionConfig.params.format || "mp3"
      case "gif":
        return "gif"
      case "frame-extract":
        return actionConfig.params.format || "png"
      default:
        return "mp4"
    }
  }

  const handleProcess = async () => {
    if (!ffmpeg || !isLoaded) {
      setError("FFmpeg is not loaded yet. Please wait.")
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setError(null)

    try {
      // Set up progress handler
      ffmpeg.on("progress", ({ progress: prog }) => {
        setProgress(Math.round(prog * 100))
      })

      // Convert file to Uint8Array and write to FFmpeg filesystem
      const arrayBuffer = await videoData.file.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)

      const inputFileName = "input.mp4"
      await ffmpeg.writeFile(inputFileName, uint8Array)

      const outputExt = getOutputExtension()
      const outputFileName = `output.${outputExt}`

      // Build FFmpeg arguments based on action type
      const args = buildFFmpegArgs(actionConfig, inputFileName, outputFileName)

      console.log("Running FFmpeg with args:", args)
      await ffmpeg.exec(args)

      // Read the output file
      const outputData = await ffmpeg.readFile(outputFileName)

      // Create blob and URL for download
      const mimeType = getMimeType(outputExt)
      const blob = new Blob([outputData], { type: mimeType })
      const url = URL.createObjectURL(blob)

      setOutputUrl(url)
      setProgress(100)
      setIsComplete(true)
    } catch (err) {
      console.error("Processing error:", err)
      setError(`Error processing video: ${(err as Error).message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const buildFFmpegArgs = (config: ActionConfig, input: string, output: string): string[] => {
    switch (config.type) {
      case "trim":
        return [
          "-i", input,
          "-ss", config.params.start || "0",
          "-to", config.params.end || String(videoData?.duration || 0),
          "-c", "copy",
          output
        ]
      case "convert":
        return [
          "-i", input,
          "-c:v", config.params.codec || "libx264",
          "-c:a", "aac",
          output
        ]
      case "compress":
        return [
          "-i", input,
          "-vcodec", "libx264",
          "-crf", String(config.params.crf || 23),
          "-preset", config.params.preset || "medium",
          output
        ]
      case "extract-audio":
        return [
          "-i", input,
          "-vn",
          "-acodec", config.params.format === "mp3" ? "libmp3lame" : "aac",
          "-b:a", config.params.bitrate || "192k",
          output
        ]
      case "gif":
        return [
          "-i", input,
          "-ss", config.params.start || "0",
          "-t", String((parseFloat(config.params.end || "3") - parseFloat(config.params.start || "0"))),
          "-vf", `fps=${config.params.fps || 10},scale=${config.params.scale || 480}:-1:flags=lanczos`,
          output
        ]
      case "resize":
        return [
          "-i", input,
          "-vf", `scale=${config.params.width || -1}:${config.params.height || -1}`,
          "-c:a", "copy",
          output
        ]
      default:
        return ["-i", input, output]
    }
  }

  const getMimeType = (ext: string): string => {
    const mimeTypes: Record<string, string> = {
      mp4: "video/mp4",
      webm: "video/webm",
      avi: "video/x-msvideo",
      mov: "video/quicktime",
      mkv: "video/x-matroska",
      mp3: "audio/mpeg",
      wav: "audio/wav",
      aac: "audio/aac",
      flac: "audio/flac",
      ogg: "audio/ogg",
      gif: "image/gif",
      png: "image/png",
      jpg: "image/jpeg",
      webp: "image/webp",
    }
    return mimeTypes[ext] || "application/octet-stream"
  }

  const handleDownload = () => {
    if (outputUrl) {
      const a = document.createElement("a")
      a.href = outputUrl
      a.download = `output_${actionConfig.type}.${getOutputExtension()}`
      a.click()
    }
  }

  const handleReset = () => {
    reset()
    router.push("/")
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Export</h2>
        <p className="text-muted-foreground">Review and execute the FFmpeg command</p>
      </div>

      {!isLoaded && (
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-accent" />
            <span className="text-sm">{ffmpegMessage || "Loading FFmpeg..."}</span>
          </div>
        </Card>
      )}

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

        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
            {error}
          </div>
        )}

        {!isProcessing && !isComplete && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Click the button below to start processing your video.</p>
            <Button
              onClick={handleProcess}
              disabled={!isLoaded}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {isLoaded ? "Start Processing" : "Loading FFmpeg..."}
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
              <Button onClick={handleReset} variant="outline" className="flex-1 bg-transparent">
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
