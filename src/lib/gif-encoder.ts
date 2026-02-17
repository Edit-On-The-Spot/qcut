import { GIFEncoder, quantize, applyPalette } from "gifenc"
import { createLogger } from "./logger"

const log = createLogger("gif-encoder")

export interface GifConfig {
  startSec: number
  endSec: number
  fps: number
  width: number
}

export interface GifProgress {
  phase: "extracting" | "encoding"
  current: number
  total: number
}

/**
 * Creates an animated GIF from a video file using gifenc.
 * This is 2-3x faster than ffmpeg.wasm for short clips (<10 seconds)
 * because it avoids ffmpeg's WASM loading overhead.
 *
 * Uses a global palette for all frames to improve encoding speed.
 */
export async function createGifWithGifenc(
  file: File,
  config: GifConfig,
  onProgress?: (progress: GifProgress) => void
): Promise<Blob> {
  const { startSec, endSec, fps, width } = config
  const durationSec = endSec - startSec
  const frameCount = Math.ceil(durationSec * fps)
  const delayMs = Math.round(1000 / fps)

  log.info("Starting GIF creation: %d frames at %d fps, width=%d", frameCount, fps, width)

  // Create video element to extract frames
  const video = document.createElement("video")
  video.preload = "auto"
  video.muted = true
  video.playsInline = true

  const objectUrl = URL.createObjectURL(file)

  try {
    video.src = objectUrl

    // Wait for metadata to load
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timeout loading video metadata")), 30000)
      video.addEventListener("loadedmetadata", () => {
        clearTimeout(timeout)
        resolve()
      }, { once: true })
      video.addEventListener("error", () => {
        clearTimeout(timeout)
        reject(new Error("Failed to load video for GIF creation"))
      }, { once: true })
    })

    // Calculate dimensions maintaining aspect ratio
    const aspectRatio = video.videoHeight / video.videoWidth
    const height = Math.round(width * aspectRatio)

    log.debug("Video dimensions: %dx%d, output: %dx%d", video.videoWidth, video.videoHeight, width, height)

    // Reuse canvas for all frames to avoid memory churn
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) {
      throw new Error("Failed to create canvas context")
    }

    // Extract frames
    const frames: ImageData[] = []
    for (let i = 0; i < frameCount; i++) {
      const targetTime = startSec + (i / fps)

      onProgress?.({
        phase: "extracting",
        current: i + 1,
        total: frameCount
      })

      // Seek to target time
      await seekToTime(video, targetTime)

      // Draw frame to canvas
      ctx.drawImage(video, 0, 0, width, height)

      // Get image data
      const imageData = ctx.getImageData(0, 0, width, height)
      frames.push(imageData)

      log.debug("Extracted frame %d/%d at %ds", i + 1, frameCount, targetTime.toFixed(2))
    }

    log.info("Extracted %d frames, starting GIF encoding", frames.length)

    // Create GIF encoder
    const gif = GIFEncoder()

    // Calculate global palette from sample frames for better color consistency
    // Sample every 5th frame or all frames if fewer than 10
    const sampleInterval = frameCount > 10 ? 5 : 1
    const samplePixels: number[] = []
    for (let i = 0; i < frames.length; i += sampleInterval) {
      const data = frames[i].data
      // Sample every 4th pixel to reduce memory usage
      for (let j = 0; j < data.length; j += 16) {
        samplePixels.push(data[j], data[j + 1], data[j + 2])
      }
    }

    log.debug("Calculating global palette from %d sample pixels", samplePixels.length / 3)
    const globalPalette = quantize(new Uint8Array(samplePixels), 256)

    // Encode frames
    for (let i = 0; i < frames.length; i++) {
      onProgress?.({
        phase: "encoding",
        current: i + 1,
        total: frames.length
      })

      const frame = frames[i]
      const indexed = applyPalette(frame.data, globalPalette)

      gif.writeFrame(indexed, width, height, {
        palette: globalPalette,
        delay: delayMs,
      })

      log.debug("Encoded frame %d/%d", i + 1, frames.length)
    }

    gif.finish()

    const bytes = gif.bytes()
    const blob = new Blob([bytes], { type: "image/gif" })

    log.info("GIF created: %d bytes (%sMB)", blob.size, (blob.size / (1024 * 1024)).toFixed(2))

    return blob
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

/**
 * Seeks video to a specific time and waits for the frame to be ready.
 */
async function seekToTime(video: HTMLVideoElement, timeSec: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timeout seeking to ${timeSec}s`)), 10000)

    const onSeeked = () => {
      clearTimeout(timeout)

      // Wait for frame to be ready using requestVideoFrameCallback if available
      if ("requestVideoFrameCallback" in video) {
        const frameTimeout = setTimeout(() => resolve(), 200) // Fallback if callback doesn't fire
        video.requestVideoFrameCallback(() => {
          clearTimeout(frameTimeout)
          resolve()
        })
      } else {
        // Fallback for browsers without requestVideoFrameCallback
        resolve()
      }
    }

    video.addEventListener("seeked", onSeeked, { once: true })
    video.addEventListener("error", () => {
      clearTimeout(timeout)
      reject(new Error("Error seeking video"))
    }, { once: true })

    video.currentTime = timeSec
  })
}

/**
 * Checks if gifenc should be used instead of ffmpeg for GIF creation.
 * Returns true for short clips where gifenc provides a speed advantage.
 */
export function shouldUseGifenc(durationSec: number): boolean {
  // Use gifenc for clips under 10 seconds
  // Longer clips benefit from ffmpeg's more efficient streaming approach
  return durationSec <= 10
}
