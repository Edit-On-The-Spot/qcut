"use client"

import { useState, useCallback } from "react"
import JSZip from "jszip"
import { useFFmpeg, useVideo, useProcessingState, type ActionConfig } from "./video-context"

/**
 * Hook for processing video with FFmpeg.
 * Returns processing state and functions to process and download.
 * Uses global processing state to enable navigation guards.
 */
export function useVideoProcessor() {
  const { ffmpeg, isLoaded } = useFFmpeg()
  const { videoData, reset } = useVideo()
  const { isProcessing, startProcessing, finishProcessing } = useProcessingState()
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

    startProcessing()
    setProgress(0)
    setError(null)
    setIsComplete(false)
    setOutputUrl(null)

    try {
      if (isSingleFrameExtract) {
        console.log("[FrameExtract] Starting single frame extraction")
        const timestampSec = Math.max(0, Number.parseFloat(config.params.timestamp || "0"))
        const format = config.params.format || "png"
        const mimeType = getMimeType(format)
        console.log("[FrameExtract] Target timestamp:", timestampSec, "format:", format)

        // Always use the original File object directly to avoid 2GB ArrayBuffer limit
        // The File object is a Blob subclass that browsers can handle efficiently
        console.log("[FrameExtract] Source file size:", videoData.file.size, "bytes")
        const objectUrl = URL.createObjectURL(videoData.file)
        console.log("[FrameExtract] Created object URL")

        try {
          const video = document.createElement("video")
          video.preload = "auto"
          video.muted = true
          video.src = objectUrl
          console.log("[FrameExtract] Created video element, waiting for metadata...")

          const metadataStartMs = performance.now()
          await new Promise<void>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              console.error("[FrameExtract] Timeout waiting for metadata after 30s")
              reject(new Error("Timeout waiting for video metadata. The video may be corrupted or too large."))
            }, 30000)
            const onError = () => {
              clearTimeout(timeoutId)
              console.error("[FrameExtract] Error loading video metadata")
              reject(new Error("Failed to load video data for frame extraction."))
            }
            video.addEventListener("loadedmetadata", () => {
              clearTimeout(timeoutId)
              console.log("[FrameExtract] Metadata loaded in", (performance.now() - metadataStartMs).toFixed(0), "ms")
              resolve()
            }, { once: true })
            video.addEventListener("error", onError, { once: true })
          })

          console.log("[FrameExtract] Video duration:", video.duration, "dimensions:", video.videoWidth, "x", video.videoHeight)
          const targetTime = Math.min(timestampSec, Math.max(0, (video.duration || timestampSec)))
          console.log("[FrameExtract] Seeking to:", targetTime, "seconds")

          const seekStartMs = performance.now()
          await new Promise<void>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              console.error("[FrameExtract] Timeout seeking after 60s, currentTime:", video.currentTime)
              reject(new Error("Timeout seeking to requested frame. Try a frame closer to the start of the video."))
            }, 60000)
            const onError = () => {
              clearTimeout(timeoutId)
              console.error("[FrameExtract] Error seeking")
              reject(new Error("Failed to seek video to the requested frame."))
            }
            const onSeeked = () => {
              clearTimeout(timeoutId)
              console.log("[FrameExtract] Seeked event fired in", (performance.now() - seekStartMs).toFixed(0), "ms")
              // requestVideoFrameCallback can hang on paused videos - use short timeout fallback
              // The seeked event already ensures we're at the correct frame
              const frameCallbackStartMs = performance.now()
              let frameCallbackResolved = false

              const resolveOnce = () => {
                if (frameCallbackResolved) return
                frameCallbackResolved = true
                console.log("[FrameExtract] Frame ready in", (performance.now() - frameCallbackStartMs).toFixed(0), "ms")
                resolve()
              }

              // Fallback timeout of 500ms - if requestVideoFrameCallback doesn't fire, proceed anyway
              const fallbackTimeout = setTimeout(() => {
                console.log("[FrameExtract] Using fallback timeout (requestVideoFrameCallback didn't fire)")
                resolveOnce()
              }, 500)

              if ("requestVideoFrameCallback" in video) {
                console.log("[FrameExtract] Waiting for video frame callback...")
                video.requestVideoFrameCallback(() => {
                  clearTimeout(fallbackTimeout)
                  console.log("[FrameExtract] Frame callback fired")
                  resolveOnce()
                })
              } else {
                clearTimeout(fallbackTimeout)
                console.log("[FrameExtract] No requestVideoFrameCallback, resolving immediately")
                resolveOnce()
              }
            }
            video.addEventListener("seeked", onSeeked, { once: true })
            video.addEventListener("error", onError, { once: true })
            video.currentTime = targetTime
          })

          console.log("[FrameExtract] Seek complete, total seek time:", (performance.now() - seekStartMs).toFixed(0), "ms")
          console.log("[FrameExtract] Creating canvas", video.videoWidth, "x", video.videoHeight)
          const canvas = document.createElement("canvas")
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          const ctx = canvas.getContext("2d")
          if (!ctx) {
            throw new Error("Unable to render frame. Please try again.")
          }
          console.log("[FrameExtract] Drawing video frame to canvas...")
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          console.log("[FrameExtract] Frame drawn, encoding to", mimeType)

          const encodeStartMs = performance.now()
          const blob = await new Promise<Blob>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              console.error("[FrameExtract] Timeout encoding after 30s")
              reject(new Error("Timeout encoding frame image."))
            }, 30000)
            canvas.toBlob((result) => {
              clearTimeout(timeoutId)
              if (!result) {
                reject(new Error("Failed to encode frame image."))
                return
              }
              console.log("[FrameExtract] Encoded in", (performance.now() - encodeStartMs).toFixed(0), "ms, size:", result.size, "bytes")
              resolve(result)
            }, mimeType)
          })

          const url = URL.createObjectURL(blob)
          setOutputUrl(url)
          setProgress(100)
          setIsComplete(true)
          console.log("[FrameExtract] Complete, triggering download")

          const a = document.createElement("a")
          a.href = url
          a.download = `${videoData.file.name.replace(/\.[^/.]+$/, "")}_frame.${format}`
          a.click()
          return
        } finally {
          URL.revokeObjectURL(objectUrl)
          console.log("[FrameExtract] Cleaned up object URL")
        }
      }

      ffmpeg.on("progress", ({ progress: prog }) => {
        setProgress(Math.round(prog * 100))
      })

      console.log("[FFmpeg] Starting processing for:", config.type)
      console.log("[FFmpeg] Video file size:", videoData.file.size, "bytes (", (videoData.file.size / (1024 * 1024)).toFixed(1), "MB)")

      let uint8Array: Uint8Array
      try {
        // Always read fresh from File to avoid detached ArrayBuffer issues
        // (FFmpeg.writeFile transfers the ArrayBuffer to the worker, making it unusable)
        console.log("[FFmpeg] Reading file into ArrayBuffer...")
        const readStartMs = performance.now()
        const buffer = await videoData.file.arrayBuffer()
        console.log("[FFmpeg] ArrayBuffer read in", (performance.now() - readStartMs).toFixed(0), "ms")
        uint8Array = new Uint8Array(buffer)
        console.log("[FFmpeg] Uint8Array length:", uint8Array.length)
      } catch (err) {
        console.error("[FFmpeg] Error reading file:", err)
        throw new Error("The selected video file is no longer accessible. Please re-select the file and try again.")
      }

      const inputFileName = "input.mp4"
      console.log("[FFmpeg] Writing file to virtual filesystem...")
      const writeStartMs = performance.now()
      await ffmpeg.writeFile(inputFileName, uint8Array)
      console.log("[FFmpeg] File written in", (performance.now() - writeStartMs).toFixed(0), "ms")

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

      console.log("[FFmpeg] Running with args:", args)
      const execStartMs = performance.now()
      await ffmpeg.exec(args)
      console.log("[FFmpeg] Execution completed in", (performance.now() - execStartMs).toFixed(0), "ms")

      let url: string
      if (config.type === "frame-extract" && config.params.mode !== "single") {
        console.log("[FrameExtract] Multi-frame mode, listing directory...")
        const format = config.params.format || "png"
        const entries = await ffmpeg.listDir("/")
        console.log("[FrameExtract] Directory entries:", entries.length)
        const frameFiles = entries
          .filter((entry: { name: string; type?: string }) => entry.type === "file")
          .map((entry: { name: string }) => entry.name)
          .filter((name: string) => name.startsWith("frame_") && name.endsWith(`.${format}`))
          .sort()

        console.log("[FrameExtract] Found", frameFiles.length, "frame files")
        if (frameFiles.length === 0) {
          throw new Error("No frames were generated. Try a larger interval or a different format.")
        }

        console.log("[FrameExtract] Creating ZIP archive...")
        const zipStartMs = performance.now()
        const zip = new JSZip()
        for (const name of frameFiles) {
          const data = await ffmpeg.readFile(name)
          const blobData = data instanceof Uint8Array ? data.slice().buffer : data
          zip.file(name, blobData)
        }
        const zipBlob = await zip.generateAsync({ type: "blob" })
        console.log("[FrameExtract] ZIP created in", (performance.now() - zipStartMs).toFixed(0), "ms, size:", zipBlob.size, "bytes")
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
      finishProcessing()
    }
  }, [ffmpeg, isLoaded, videoData, startProcessing, finishProcessing])

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
    finishProcessing()
    setIsComplete(false)
    setProgress(0)
    setOutputUrl(null)
    setError(null)
  }, [finishProcessing])

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
