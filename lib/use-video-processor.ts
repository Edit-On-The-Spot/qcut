"use client"

import { useState, useCallback } from "react"
import JSZip from "jszip"
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
        return config.params.mode === "single" ? config.params.format || "png" : "zip"
      default:
        return "mp4"
    }
  }

  const buildFFmpegArgs = (config: ActionConfig, input: string, output: string): string[] => {
    switch (config.type) {
      case "trim":
        const startSec = Number.parseFloat(config.params.start || "0")
        const endSec = Number.parseFloat(config.params.end || String(videoData?.duration || 0))
        const durationSec = Math.max(0, endSec - startSec)
        return [
          "-ss", String(startSec || 0),
          "-t", String(durationSec || 0),
          "-i", input,
          "-c", "copy",
          output
        ]
      case "convert":
        const requestedCodec = config.params.codec || "libx264"
        return requestedCodec === "copy"
          ? ["-i", input, "-c", "copy", output]
          : ["-i", input, "-c:v", requestedCodec, "-c:a", "copy", output]
      case "compress":
        return [
          "-i", input,
          "-vcodec", "libx264",
          "-crf", String(config.params.crf || 23),
          "-preset", config.params.preset || "medium",
          "-c:a", "copy",
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
          "-c:v", "libx264",
          "-c:a", "copy",
          output
        ]
      case "frame-extract": {
        const format = config.params.format || "png"
        if (config.params.mode === "single") {
          return [
            "-ss", config.params.timestamp || "0",
            "-i", input,
            "-frames:v", "1",
            output
          ]
        }
        const interval = Number.parseFloat(config.params.interval || "1")
        if (config.params.mode === "interval" && interval > 0) {
          return [
            "-i", input,
            "-vf", `fps=1/${interval}`,
            `frame_%04d.${format}`
          ]
        }
        return [
          "-i", input,
          "-vsync", "0",
          `frame_%04d.${format}`
        ]
      }
      case "normalize-audio":
        return [
          "-i", input,
          "-af", `loudnorm=I=${config.params.targetLoudnessLufs || -16}:TP=${config.params.truePeakDb || -1.5}:LRA=${config.params.loudnessRangeLu || 11}`,
          "-c:v", "copy",
          "-c:a", "aac",
          output
        ]
      case "rotate": {
        const rotation = config.params.rotation || 0
        const hasFlip = config.params.isFlipHorizontal || config.params.isFlipVertical
        const isLosslessFormat = config.params.isLosslessFormat === true

        if (isLosslessFormat && !hasFlip) {
          if (rotation === 0) {
            return ["-i", input, "-c", "copy", output]
          }
          return [
            "-i", input,
            "-c", "copy",
            "-metadata:s:v", `rotate=${rotation}`,
            output
          ]
        }

        // Fall back to filter-based rotation for flips or unsupported formats
        const filters: string[] = []
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
          "-c:v", "libx264",
          "-c:a", "copy",
          output
        ]
      }
      case "merge":
        return [
          "-i", input,
          "-i", "audio.input",
          "-map", "0:v:0",
          "-map", "1:a:0",
          "-shortest",
          "-c:v", "copy",
          "-c:a", "aac",
          output
        ]
      case "combine":
        return [
          "-f", "concat",
          "-safe", "0",
          "-i", "concat.txt",
          "-c", "copy",
          output
        ]
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
          "-c:v", "libx264",
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
      zip: "application/zip",
    }
    return mimeTypes[ext] || "application/octet-stream"
  }

  const process = useCallback(async (config: ActionConfig) => {
    const isSingleFrameExtract = config.type === "frame-extract" && config.params.mode === "single"
    if (!videoData) {
      setError("No video is loaded yet. Please select a video first.")
      return
    }
    if (!isSingleFrameExtract && (!ffmpeg || !isLoaded)) {
      setError("FFmpeg is not loaded yet. Please wait.")
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setError(null)
    setIsComplete(false)
    setOutputUrl(null)

    try {
      if (isSingleFrameExtract) {
        const timestampSec = Math.max(0, Number.parseFloat(config.params.timestamp || "0"))
        const format = config.params.format || "png"
        const mimeType = getMimeType(format)
        const sourceBlob = videoData.fileData
          ? new Blob([videoData.fileData], { type: videoData.file.type || "video/mp4" })
          : videoData.file
        const objectUrl = URL.createObjectURL(sourceBlob)

        try {
          const video = document.createElement("video")
          video.preload = "auto"
          video.muted = true
          video.src = objectUrl

          await new Promise<void>((resolve, reject) => {
            const onError = () => reject(new Error("Failed to load video data for frame extraction."))
            video.addEventListener("loadedmetadata", () => resolve(), { once: true })
            video.addEventListener("error", onError, { once: true })
          })

          const targetTime = Math.min(timestampSec, Math.max(0, (video.duration || timestampSec)))

          await new Promise<void>((resolve, reject) => {
            const onError = () => reject(new Error("Failed to seek video to the requested frame."))
            const onSeeked = () => {
              if ("requestVideoFrameCallback" in video) {
                video.requestVideoFrameCallback(() => resolve())
              } else {
                resolve()
              }
            }
            video.addEventListener("seeked", onSeeked, { once: true })
            video.addEventListener("error", onError, { once: true })
            video.currentTime = targetTime
          })

          const canvas = document.createElement("canvas")
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          const ctx = canvas.getContext("2d")
          if (!ctx) {
            throw new Error("Unable to render frame. Please try again.")
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

          const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((result) => {
              if (!result) {
                reject(new Error("Failed to encode frame image."))
                return
              }
              resolve(result)
            }, mimeType)
          })

          const url = URL.createObjectURL(blob)
          setOutputUrl(url)
          setProgress(100)
          setIsComplete(true)

          const a = document.createElement("a")
          a.href = url
          a.download = `${videoData.file.name.replace(/\.[^/.]+$/, "")}_frame.${format}`
          a.click()
          return
        } finally {
          URL.revokeObjectURL(objectUrl)
        }
      }

      ffmpeg.on("progress", ({ progress: prog }) => {
        setProgress(Math.round(prog * 100))
      })

      let uint8Array: Uint8Array
      try {
        uint8Array = videoData.fileData
          ? videoData.fileData
          : new Uint8Array(await videoData.file.arrayBuffer())
      } catch {
        throw new Error("The selected video file is no longer accessible. Please re-select the file and try again.")
      }

      const inputFileName = "input.mp4"
      await ffmpeg.writeFile(inputFileName, uint8Array)

      if (config.type === "merge") {
        const audioFile = config.params.audioFile as File | undefined
        if (!audioFile) {
          throw new Error("Select an audio file to merge before processing.")
        }
        const audioBuffer = new Uint8Array(await audioFile.arrayBuffer())
        await ffmpeg.writeFile("audio.input", audioBuffer)
      }

      if (config.type === "combine") {
        const clips = config.params.clips as File[] | undefined
        if (!clips || clips.length < 2) {
          throw new Error("Add at least two clips to combine before processing.")
        }
        const clipNames: string[] = []
        for (let i = 0; i < clips.length; i += 1) {
          const clip = clips[i]
          const ext = clip.name.split(".").pop()
          const clipName = `clip_${i}${ext ? `.${ext}` : ""}`
          const clipBuffer = new Uint8Array(await clip.arrayBuffer())
          await ffmpeg.writeFile(clipName, clipBuffer)
          clipNames.push(clipName)
        }
        const listContents = clipNames.map((name) => `file '${name}'`).join("\n")
        await ffmpeg.writeFile("concat.txt", new TextEncoder().encode(listContents))
      }

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

      let url: string
      if (config.type === "frame-extract" && config.params.mode !== "single") {
        const format = config.params.format || "png"
        const entries = await ffmpeg.listDir("/")
        const frameFiles = entries
          .filter((entry: { name: string; type?: string }) => entry.type === "file")
          .map((entry: { name: string }) => entry.name)
          .filter((name: string) => name.startsWith("frame_") && name.endsWith(`.${format}`))
          .sort()

        if (frameFiles.length === 0) {
          throw new Error("No frames were generated. Try a larger interval or a different format.")
        }

        const zip = new JSZip()
        for (const name of frameFiles) {
          const data = await ffmpeg.readFile(name)
          const blobData = data instanceof Uint8Array ? data.slice().buffer : data
          zip.file(name, blobData)
        }
        const zipBlob = await zip.generateAsync({ type: "blob" })
        url = URL.createObjectURL(zipBlob)
      } else {
        const outputData = await ffmpeg.readFile(outputFileName)
        const mimeType = getMimeType(outputExt)
        const blobData = outputData instanceof Uint8Array ? outputData.slice().buffer : outputData
        const blob = new Blob([blobData], { type: mimeType })
        url = URL.createObjectURL(blob)
      }

      setOutputUrl(url)
      setProgress(100)
      setIsComplete(true)

      // Auto-download
      const a = document.createElement("a")
      a.href = url
      a.download = `${videoData.file.name.replace(/\.[^/.]+$/, "")}_${config.type}.${outputExt}`
      a.click()
    } catch (err) {
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
