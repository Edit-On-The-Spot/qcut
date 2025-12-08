"use client"

import { useState, useCallback } from "react"
import { useFFmpeg, useVideo, type ActionConfig } from "./video-context"

/**
 * Hook for processing video with FFmpeg.
 * Returns processing state and functions to process and download.
 */
export function useVideoProcessor() {
  const { ffmpeg, isLoaded } = useFFmpeg()
  const { videoData, reset } = useVideo()
  const [isProcessing, setIsProcessing] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [progress, setProgress] = useState(0)
  const [outputUrl, setOutputUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const getOutputExtension = (config: ActionConfig): string => {
    switch (config.type) {
      case "convert":
        return config.params.format || "mp4"
      case "extract-audio":
        return config.params.format || "mp3"
      case "gif":
        return "gif"
      case "frame-extract":
        return config.params.format || "png"
      default:
        return "mp4"
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

  const process = useCallback(async (config: ActionConfig) => {
    if (!ffmpeg || !isLoaded || !videoData) {
      setError("FFmpeg is not loaded yet. Please wait.")
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setError(null)
    setIsComplete(false)
    setOutputUrl(null)

    try {
      ffmpeg.on("progress", ({ progress: prog }) => {
        setProgress(Math.round(prog * 100))
      })

      const arrayBuffer = await videoData.file.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)

      const inputFileName = "input.mp4"
      await ffmpeg.writeFile(inputFileName, uint8Array)

      const outputExt = getOutputExtension(config)
      const outputFileName = `output.${outputExt}`

      const args = buildFFmpegArgs(config, inputFileName, outputFileName)

      console.log("Running FFmpeg with args:", args)
      await ffmpeg.exec(args)

      const outputData = await ffmpeg.readFile(outputFileName)

      const mimeType = getMimeType(outputExt)
      const blob = new Blob([outputData], { type: mimeType })
      const url = URL.createObjectURL(blob)

      setOutputUrl(url)
      setProgress(100)
      setIsComplete(true)

      // Auto-download
      const a = document.createElement("a")
      a.href = url
      a.download = `${videoData.file.name.replace(/\.[^/.]+$/, "")}_${config.type}.${outputExt}`
      a.click()
    } catch (err) {
      console.error("Processing error:", err)
      setError(`Error processing video: ${(err as Error).message}`)
    } finally {
      setIsProcessing(false)
    }
  }, [ffmpeg, isLoaded, videoData])

  const download = useCallback((config: ActionConfig) => {
    if (outputUrl) {
      const outputExt = getOutputExtension(config)
      const a = document.createElement("a")
      a.href = outputUrl
      a.download = `${videoData?.file.name.replace(/\.[^/.]+$/, "") || "output"}_${config.type}.${outputExt}`
      a.click()
    }
  }, [outputUrl, videoData])

  const resetProcessor = useCallback(() => {
    setIsProcessing(false)
    setIsComplete(false)
    setProgress(0)
    setOutputUrl(null)
    setError(null)
  }, [])

  return {
    isLoaded,
    isProcessing,
    isComplete,
    progress,
    error,
    process,
    download,
    resetProcessor,
    resetAll: reset,
  }
}
