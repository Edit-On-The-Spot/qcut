"use client"

import { useState, useCallback, useRef } from "react"
import JSZip from "jszip"
import { useFFmpeg, useVideo, useProcessingState, type ActionConfig } from "./video-context"
import { createLogger } from "./logger"
import {
  trackProcessingStart,
  trackProcessingComplete,
  trackProcessingError,
  trackDownload,
} from "./analytics"
import { createGifWithGifenc, shouldUseGifenc, type GifProgress } from "./gif-encoder"

const log = createLogger("processor")

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
  // Track current output URL ref for cleanup to prevent memory leaks
  const outputUrlRef = useRef<string | null>(null)
  // Track when processing started for ETA calculation
  const [processingStartTimeMs, setProcessingStartTimeMs] = useState<number | null>(null)

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

    // Check if this is a short GIF that should use gifenc
    const isGifWithGifenc = config.type === "gif" && (() => {
      const startSec = Number.parseFloat(config.params.start || "0")
      const endSec = Number.parseFloat(config.params.end || "3")
      const durationSec = endSec - startSec
      return shouldUseGifenc(durationSec)
    })()

    if (!videoData) {
      setError("No video is loaded yet. Please select a video first.")
      return
    }
    if (!isSingleFrameExtract && !isGifWithGifenc && (!ffmpeg || !isLoaded)) {
      setError("FFmpeg is not loaded yet. Please wait.")
      return
    }

    startProcessing()
    setProgress(0)
    setError(null)
    setIsComplete(false)
    setOutputUrl(null)
    const processingStartMs = performance.now()
    setProcessingStartTimeMs(processingStartMs)
    trackProcessingStart(config.type)

    try {
      if (isSingleFrameExtract) {
        log.info("Starting single frame extraction")
        const timestampSec = Math.max(0, Number.parseFloat(config.params.timestamp || "0"))
        const format = config.params.format || "png"
        const mimeType = getMimeType(format)
        log.debug("Target timestamp: %d, format: %s", timestampSec, format)

        // Always use the original File object directly to avoid 2GB ArrayBuffer limit
        // The File object is a Blob subclass that browsers can handle efficiently
        log.debug("Source file size: %d bytes", videoData.file.size)
        const objectUrl = URL.createObjectURL(videoData.file)
        log.debug("Created object URL")

        try {
          const video = document.createElement("video")
          video.preload = "auto"
          video.muted = true
          video.src = objectUrl
          log.debug("Created video element, waiting for metadata")

          const metadataStartMs = performance.now()
          await new Promise<void>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              log.error("Timeout waiting for metadata after 30s")
              reject(new Error("Timeout waiting for video metadata. The video may be corrupted or too large."))
            }, 30000)
            const onError = () => {
              clearTimeout(timeoutId)
              log.error("Error loading video metadata")
              reject(new Error("Failed to load video data for frame extraction."))
            }
            video.addEventListener("loadedmetadata", () => {
              clearTimeout(timeoutId)
              log.debug("Metadata loaded in %dms", Math.round(performance.now() - metadataStartMs))
              resolve()
            }, { once: true })
            video.addEventListener("error", onError, { once: true })
          })

          log.debug("Video duration: %d, dimensions: %dx%d", video.duration, video.videoWidth, video.videoHeight)
          const targetTime = Math.min(timestampSec, Math.max(0, (video.duration || timestampSec)))
          log.debug("Seeking to: %d seconds", targetTime)

          const seekStartMs = performance.now()
          await new Promise<void>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              log.error("Timeout seeking after 60s, currentTime: %d", video.currentTime)
              reject(new Error("Timeout seeking to requested frame. Try a frame closer to the start of the video."))
            }, 60000)
            const onError = () => {
              clearTimeout(timeoutId)
              log.error("Error seeking")
              reject(new Error("Failed to seek video to the requested frame."))
            }
            const onSeeked = () => {
              clearTimeout(timeoutId)
              log.debug("Seeked event fired in %dms", Math.round(performance.now() - seekStartMs))
              // requestVideoFrameCallback can hang on paused videos - use short timeout fallback
              // The seeked event already ensures we're at the correct frame
              const frameCallbackStartMs = performance.now()
              let frameCallbackResolved = false

              const resolveOnce = () => {
                if (frameCallbackResolved) return
                frameCallbackResolved = true
                log.debug("Frame ready in %dms", Math.round(performance.now() - frameCallbackStartMs))
                resolve()
              }

              // Fallback timeout of 500ms - if requestVideoFrameCallback doesn't fire, proceed anyway
              const fallbackTimeout = setTimeout(() => {
                log.debug("Using fallback timeout (requestVideoFrameCallback didn't fire)")
                resolveOnce()
              }, 500)

              if ("requestVideoFrameCallback" in video) {
                log.debug("Waiting for video frame callback")
                video.requestVideoFrameCallback(() => {
                  clearTimeout(fallbackTimeout)
                  log.debug("Frame callback fired")
                  resolveOnce()
                })
              } else {
                clearTimeout(fallbackTimeout)
                log.debug("No requestVideoFrameCallback, resolving immediately")
                resolveOnce()
              }
            }
            video.addEventListener("seeked", onSeeked, { once: true })
            video.addEventListener("error", onError, { once: true })
            video.currentTime = targetTime
          })

          log.debug("Seek complete, total seek time: %dms", Math.round(performance.now() - seekStartMs))
          log.debug("Creating canvas %dx%d", video.videoWidth, video.videoHeight)
          const canvas = document.createElement("canvas")
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          const ctx = canvas.getContext("2d")
          if (!ctx) {
            throw new Error("Unable to render frame. Please try again.")
          }
          log.debug("Drawing video frame to canvas")
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          log.debug("Frame drawn, encoding to %s", mimeType)

          const encodeStartMs = performance.now()
          const blob = await new Promise<Blob>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              log.error("Timeout encoding after 30s")
              reject(new Error("Timeout encoding frame image."))
            }, 30000)
            canvas.toBlob((result) => {
              clearTimeout(timeoutId)
              if (!result) {
                reject(new Error("Failed to encode frame image."))
                return
              }
              log.debug("Encoded in %dms, size: %d bytes", Math.round(performance.now() - encodeStartMs), result.size)
              resolve(result)
            }, mimeType)
          })

          const url = URL.createObjectURL(blob)
          // Revoke previous URL to prevent memory leak
          if (outputUrlRef.current) {
            URL.revokeObjectURL(outputUrlRef.current)
            log.debug("Revoked previous output URL")
          }
          outputUrlRef.current = url
          setOutputUrl(url)
          setProgress(100)
          setIsComplete(true)
          setProcessingStartTimeMs(null)
          const durationMs = Math.round(performance.now() - processingStartMs)
          trackProcessingComplete(config.type, durationMs)
          log.info("Frame extraction complete in %dms, triggering download", durationMs)

          const a = document.createElement("a")
          a.href = url
          a.download = `${videoData.file.name.replace(/\.[^/.]+$/, "")}_frame.${format}`
          a.click()
          const fileSizeMB = blob.size / (1024 * 1024)
          trackDownload(config.type, fileSizeMB)
          return
        } finally {
          URL.revokeObjectURL(objectUrl)
          log.debug("Cleaned up object URL")
        }
      }

      // Handle short GIF clips with gifenc (2-3x faster than ffmpeg.wasm)
      if (isGifWithGifenc) {
        log.info("Using gifenc for fast GIF creation")
        const startSec = Number.parseFloat(config.params.start || "0")
        const endSec = Number.parseFloat(config.params.end || "3")
        const fps = config.params.fps || 10
        const width = config.params.scale || 480

        const handleGifProgress = (progress: GifProgress) => {
          // Map the two phases to a 0-100 progress
          // Extracting: 0-60%, Encoding: 60-100%
          if (progress.phase === "extracting") {
            setProgress(Math.round((progress.current / progress.total) * 60))
          } else {
            setProgress(60 + Math.round((progress.current / progress.total) * 40))
          }
        }

        const blob = await createGifWithGifenc(
          videoData.file,
          { startSec, endSec, fps, width },
          handleGifProgress
        )

        const url = URL.createObjectURL(blob)
        // Revoke previous URL to prevent memory leak
        if (outputUrlRef.current) {
          URL.revokeObjectURL(outputUrlRef.current)
          log.debug("Revoked previous output URL")
        }
        outputUrlRef.current = url
        setOutputUrl(url)
        setProgress(100)
        setIsComplete(true)
        setProcessingStartTimeMs(null)
        const durationMs = Math.round(performance.now() - processingStartMs)
        trackProcessingComplete(config.type, durationMs)
        log.info("GIF creation complete in %dms (gifenc)", durationMs)

        // Auto-download
        const a = document.createElement("a")
        a.href = url
        a.download = `${videoData.file.name.replace(/\.[^/.]+$/, "")}_${config.type}.gif`
        a.click()
        const fileSizeMB = blob.size / (1024 * 1024)
        trackDownload(config.type, fileSizeMB)
        return
      }

      // FFmpeg is guaranteed to be loaded at this point (checked above for non-single-frame)
      // Use non-null assertion since TypeScript can't narrow across the isSingleFrameExtract branch
      const ffmpegInstance = ffmpeg!

      ffmpegInstance.on("progress", ({ progress: prog }) => {
        setProgress(Math.round(prog * 100))
      })

      log.info("Starting processing for: %s", config.type)
      log.debug("Video file size: %d bytes (%sMB)", videoData.file.size, (videoData.file.size / (1024 * 1024)).toFixed(1))

      let uint8Array: Uint8Array
      try {
        // Always read fresh from File to avoid detached ArrayBuffer issues
        // (FFmpeg.writeFile transfers the ArrayBuffer to the worker, making it unusable)
        log.debug("Reading file into ArrayBuffer")
        const readStartMs = performance.now()
        const buffer = await videoData.file.arrayBuffer()
        log.debug("ArrayBuffer read in %dms", Math.round(performance.now() - readStartMs))
        uint8Array = new Uint8Array(buffer)
        log.debug("Uint8Array length: %d", uint8Array.length)
      } catch (err) {
        log.error("Error reading file:", err)
        throw new Error("The selected video file is no longer accessible. Please re-select the file and try again.")
      }

      const inputFileName = "input.mp4"
      log.debug("Writing file to virtual filesystem")
      const writeStartMs = performance.now()
      await ffmpegInstance.writeFile(inputFileName, uint8Array)
      log.debug("File written in %dms", Math.round(performance.now() - writeStartMs))

      if (config.type === "merge") {
        const audioFile = config.params.audioFile as File | undefined
        if (!audioFile) {
          throw new Error("Select an audio file to merge before processing.")
        }
        const audioBuffer = new Uint8Array(await audioFile.arrayBuffer())
        await ffmpegInstance.writeFile("audio.input", audioBuffer)
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
          await ffmpegInstance.writeFile(clipName, clipBuffer)
          clipNames.push(clipName)
        }
        const listContents = clipNames.map((name) => `file '${name}'`).join("\n")
        await ffmpegInstance.writeFile("concat.txt", new TextEncoder().encode(listContents))
      }

      // Write overlay image file if present (for overlay operation)
      if (config.type === "overlay" && config.params.overlayFile) {
        const overlayBuffer = await (config.params.overlayFile as File).arrayBuffer()
        const overlayUint8 = new Uint8Array(overlayBuffer)
        await ffmpegInstance.writeFile("overlay.png", overlayUint8)
      }

      const outputExt = getOutputExtension(config)
      const outputFileName = `output.${outputExt}`

      const args = buildFFmpegArgs(config, inputFileName, outputFileName)

      log.info("Running FFmpeg with args: %o", args)
      const execStartMs = performance.now()
      await ffmpegInstance.exec(args)
      log.info("FFmpeg execution completed in %dms", Math.round(performance.now() - execStartMs))

      let url: string
      if (config.type === "frame-extract" && config.params.mode !== "single") {
        log.info("Multi-frame mode, listing directory")
        const format = config.params.format || "png"
        const entries = await ffmpegInstance.listDir("/")
        log.debug("Directory entries:", entries.length)
        const frameFiles = entries
          .filter((entry: { name: string; type?: string }) => entry.type === "file")
          .map((entry: { name: string }) => entry.name)
          .filter((name: string) => name.startsWith("frame_") && name.endsWith(`.${format}`))
          .sort()

        log.info("Found %d frame files", frameFiles.length)
        if (frameFiles.length === 0) {
          throw new Error("No frames were generated. Try a larger interval or a different format.")
        }

        log.info("Creating ZIP archive")
        const zipStartMs = performance.now()
        const zip = new JSZip()
        for (const name of frameFiles) {
          const data = await ffmpegInstance.readFile(name)
          const blobData = data instanceof Uint8Array ? data.slice().buffer : data
          zip.file(name, blobData)
        }
        const zipBlob = await zip.generateAsync({ type: "blob" })
        log.info("ZIP created in %dms, size: %d bytes", Math.round(performance.now() - zipStartMs), zipBlob.size)
        url = URL.createObjectURL(zipBlob)
      } else {
        const outputData = await ffmpegInstance.readFile(outputFileName)
        const mimeType = getMimeType(outputExt)
        const blobData = outputData instanceof Uint8Array ? outputData.slice().buffer : outputData
        const blob = new Blob([blobData], { type: mimeType })
        url = URL.createObjectURL(blob)
      }

      // Revoke previous URL to prevent memory leak
      if (outputUrlRef.current) {
        URL.revokeObjectURL(outputUrlRef.current)
        log.debug("Revoked previous output URL")
      }
      outputUrlRef.current = url
      setOutputUrl(url)
      setProgress(100)
      setIsComplete(true)
      setProcessingStartTimeMs(null)
      const durationMs = Math.round(performance.now() - processingStartMs)
      trackProcessingComplete(config.type, durationMs)

      // Auto-download
      const a = document.createElement("a")
      a.href = url
      a.download = `${videoData.file.name.replace(/\.[^/.]+$/, "")}_${config.type}.${outputExt}`
      a.click()
      // Estimate file size from blob URL - use a fetch to get actual size
      fetch(url).then(res => res.blob()).then(blob => {
        trackDownload(config.type, blob.size / (1024 * 1024))
      }).catch(() => {
        // Track download anyway with 0 size if fetch fails
        trackDownload(config.type, 0)
      })
    } catch (err) {
      const errorMessage = (err as Error).message
      trackProcessingError(config.type, errorMessage)
      setError(`Error processing video: ${errorMessage}`)
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
      // Track manual re-download
      fetch(outputUrl).then(res => res.blob()).then(blob => {
        trackDownload(config.type, blob.size / (1024 * 1024))
      }).catch(() => {
        trackDownload(config.type, 0)
      })
    }
  }, [outputUrl, videoData])

  const resetProcessor = useCallback(() => {
    // Revoke output URL to prevent memory leak
    if (outputUrlRef.current) {
      URL.revokeObjectURL(outputUrlRef.current)
      log.debug("Revoked output URL on reset")
      outputUrlRef.current = null
    }
    finishProcessing()
    setIsComplete(false)
    setProgress(0)
    setOutputUrl(null)
    setError(null)
    setProcessingStartTimeMs(null)
  }, [finishProcessing])

  return {
    isLoaded,
    isProcessing,
    isComplete,
    progress,
    processingStartTimeMs,
    error,
    process,
    download,
    resetProcessor,
    resetAll: reset,
  }
}
