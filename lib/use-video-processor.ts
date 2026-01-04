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
        // Support extracting audio OR video (muted)
        if (config.params.extractMode === "video") {
          return config.params.videoFormat || "mp4"
        }
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
        // Support extracting audio OR video (muted)
        if (config.params.extractMode === "video") {
          return [
            "-i", input,
            "-an",
            "-c:v", "copy",
            output
          ]
        }
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
      case "normalize-audio":
        return [
          "-i", input,
          "-af", `loudnorm=I=${config.params.targetLoudnessLufs || -16}:TP=${config.params.truePeakDb || -1.5}:LRA=${config.params.loudnessRangeLu || 11}`,
          "-c:v", "copy",
          output
        ]
      case "rotate": {
        const filters: string[] = []
        const rotation = config.params.rotation || 0
        if (rotation === 90) {
          filters.push("transpose=1")
        } else if (rotation === 180) {
          filters.push("transpose=1,transpose=1")
        } else if (rotation === 270) {
          filters.push("transpose=2")
        }
        if (config.params.isFlipHorizontal) {
          filters.push("hflip")
        }
        if (config.params.isFlipVertical) {
          filters.push("vflip")
        }
        if (filters.length === 0) {
          return ["-i", input, "-c", "copy", output]
        }
        return [
          "-i", input,
          "-vf", filters.join(","),
          "-c:a", "copy",
          output
        ]
      }
      case "overlay": {
        const position = config.params.position || "top-left"
        const scalePct = config.params.scalePct || 100
        const opacityPct = config.params.opacityPct || 100
        let xExpr: string
        let yExpr: string
        const offsetX = config.params.offsetX || 10
        const offsetY = config.params.offsetY || 10
        switch (position) {
          case "top-right":
            xExpr = `W-w-${offsetX}`
            yExpr = String(offsetY)
            break
          case "bottom-left":
            xExpr = String(offsetX)
            yExpr = `H-h-${offsetY}`
            break
          case "bottom-right":
            xExpr = `W-w-${offsetX}`
            yExpr = `H-h-${offsetY}`
            break
          case "center":
            xExpr = "(W-w)/2"
            yExpr = "(H-h)/2"
            break
          default: // top-left
            xExpr = String(offsetX)
            yExpr = String(offsetY)
        }
        const scaleFilter = scalePct !== 100 ? `[1:v]scale=iw*${scalePct}/100:-1[ovr];` : ""
        const overlayInput = scalePct !== 100 ? "[ovr]" : "[1:v]"
        const opacityFilter = opacityPct !== 100 ? `format=rgba,colorchannelmixer=aa=${opacityPct / 100}` : ""
        const overlayInputWithOpacity = opacityFilter ? `${overlayInput}${opacityFilter}[ovr2];[0:v][ovr2]` : `[0:v]${overlayInput}`
        const filterComplex = `${scaleFilter}${overlayInputWithOpacity}overlay=${xExpr}:${yExpr}`
        return [
          "-i", input,
          "-i", "overlay.png",
          "-filter_complex", filterComplex,
          "-c:a", "copy",
          output
        ]
      }
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

      // Write overlay image file if present (for overlay operation)
      if (config.type === "overlay" && config.params.overlayFile) {
        const overlayBuffer = await (config.params.overlayFile as File).arrayBuffer()
        const overlayUint8 = new Uint8Array(overlayBuffer)
        await ffmpeg.writeFile("overlay.png", overlayUint8)
      }

      const outputExt = getOutputExtension(config)
      const outputFileName = `output.${outputExt}`

      const args = buildFFmpegArgs(config, inputFileName, outputFileName)

      console.log("Running FFmpeg with args:", args)
      await ffmpeg.exec(args)

      const outputData = await ffmpeg.readFile(outputFileName)

      const mimeType = getMimeType(outputExt)
      const blobData = outputData instanceof Uint8Array ? outputData.slice().buffer : outputData
      const blob = new Blob([blobData], { type: mimeType })
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
