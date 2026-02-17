import type { VideoData } from "../types"
import { getState, setState } from "../store"

const THUMBNAIL_WIDTH_PX = 160
const THUMBNAIL_HEIGHT_PX = 90
const PARALLEL_WORKERS = 4

/**
 * Generates a cache key for a thumbnail based on video name and timestamp.
 * Rounds to milliseconds to avoid floating point issues in the key.
 * @param videoName - Name of the video file
 * @param timestampSec - Timestamp in seconds
 * @returns Cache key string
 */
function getCacheKey(videoName: string, timestampSec: number): string {
  const timestampMs = Math.round(timestampSec * 1000)
  return `${videoName}:${timestampMs}`
}

interface ThumbnailWorker {
  video: HTMLVideoElement
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  isBusy: boolean
}

/**
 * Creates a thumbnail worker with a hidden video element and canvas.
 * @param videoUrl - URL of the video to load
 * @returns Promise resolving to the worker
 */
async function createWorker(videoUrl: string): Promise<ThumbnailWorker> {
  const video = document.createElement("video")
  video.src = videoUrl
  video.muted = true
  video.preload = "auto"

  const canvas = document.createElement("canvas")
  canvas.width = THUMBNAIL_WIDTH_PX
  canvas.height = THUMBNAIL_HEIGHT_PX
  const ctx = canvas.getContext("2d")!

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve()
    video.onerror = () => reject(new Error("Failed to load video for thumbnail worker"))
  })

  return { video, canvas, ctx, isBusy: false }
}

/**
 * Generates a thumbnail at the specified timestamp using a worker.
 * Seeks the worker's video to the given time, draws the frame to canvas,
 * and returns a JPEG data URL.
 * @param worker - The thumbnail worker to use
 * @param timestampSec - Timestamp in seconds
 * @returns Promise resolving to data URL of the thumbnail
 */
async function generateThumbnail(worker: ThumbnailWorker, timestampSec: number): Promise<string> {
  const { video, canvas, ctx } = worker

  video.currentTime = timestampSec

  await new Promise<void>((resolve) => {
    video.onseeked = () => resolve()
  })

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL("image/jpeg", 0.8)
}

/**
 * Creates an FFmpeg thumbnail generator for a video.
 * Uses parallel hidden video elements + canvas to generate thumbnails.
 * Caches thumbnails by video name + timestamp in the global store.
 * @param videoData - The video data to generate thumbnails from
 * @returns Object with methods to request, cancel, get thumbnails and cleanup
 */
export function createFFmpegThumbnails(videoData: VideoData): {
  requestThumbnails: (timestampsSec: number[]) => void
  cancelPending: () => void
  getThumbnails: (timestampsSec: number[]) => Map<number, string>
  isReady: boolean
  destroy: () => void
} {
  let workers: ThumbnailWorker[] = []
  let videoUrl: string | null = null
  let isReady = false
  let isProcessing = false
  const pendingQueue: number[] = []

  videoUrl = URL.createObjectURL(videoData.file)

  const initPromise = (async () => {
    if (!videoUrl) return
    for (let i = 0; i < PARALLEL_WORKERS; i++) {
      try {
        const worker = await createWorker(videoUrl)
        workers.push(worker)
      } catch (error) {
        console.error(`Failed to create thumbnail worker ${i}:`, error)
      }
    }
    isReady = workers.length > 0
  })()

  /**
   * Processes pending thumbnail requests using available workers in batches.
   */
  async function processQueue(): Promise<void> {
    if (isProcessing) return
    if (pendingQueue.length === 0) return

    isProcessing = true

    if (workers.length === 0) {
      isProcessing = false
      return
    }

    while (pendingQueue.length > 0) {
      const batch: Array<{ timestampSec: number; worker: ThumbnailWorker }> = []

      for (const worker of workers) {
        if (pendingQueue.length === 0) break
        if (!worker.isBusy) {
          const timestampSec = pendingQueue.shift()!
          worker.isBusy = true
          batch.push({ timestampSec, worker })
        }
      }

      if (batch.length === 0) break

      const results = await Promise.all(
        batch.map(async ({ timestampSec, worker }) => {
          try {
            const dataUrl = await generateThumbnail(worker, timestampSec)
            return { timestampSec, dataUrl }
          } catch (error) {
            console.error(`Error generating thumbnail at ${timestampSec}:`, error)
            return { timestampSec, dataUrl: null }
          } finally {
            worker.isBusy = false
          }
        })
      )

      const cache = new Map(getState().thumbnailCache)
      for (const { timestampSec, dataUrl } of results) {
        if (dataUrl) {
          const key = getCacheKey(videoData.file.name, timestampSec)
          cache.set(key, dataUrl)
        }
      }
      setState({ thumbnailCache: cache })
    }

    isProcessing = false
  }

  return {
    get isReady() {
      return isReady
    },

    /**
     * Requests thumbnails for the given timestamps.
     * Skips already-cached timestamps and queues the rest.
     * @param timestampsSec - Array of timestamps in seconds
     */
    requestThumbnails(timestampsSec: number[]): void {
      const cache = getState().thumbnailCache
      const uncached = timestampsSec.filter((ts) => {
        const key = getCacheKey(videoData.file.name, ts)
        return !cache.has(key)
      })

      if (uncached.length === 0) return

      const currentQueue = new Set(pendingQueue)
      for (const ts of uncached) {
        if (!currentQueue.has(ts)) {
          pendingQueue.push(ts)
        }
      }

      processQueue()
    },

    /**
     * Cancels all pending thumbnail generation requests.
     */
    cancelPending(): void {
      pendingQueue.length = 0
    },

    /**
     * Gets cached thumbnails for the given timestamps.
     * @param timestampsSec - Array of timestamps in seconds
     * @returns Map of timestamp to data URL (only includes cached thumbnails)
     */
    getThumbnails(timestampsSec: number[]): Map<number, string> {
      const result = new Map<number, string>()
      const cache = getState().thumbnailCache

      for (const ts of timestampsSec) {
        const key = getCacheKey(videoData.file.name, ts)
        const cached = cache.get(key)
        if (cached) {
          result.set(ts, cached)
        }
      }

      return result
    },

    /**
     * Cleans up workers and revokes the video URL.
     */
    destroy(): void {
      pendingQueue.length = 0
      workers.forEach((w) => {
        w.video.src = ""
      })
      workers = []
      isReady = false
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl)
        videoUrl = null
      }
    },
  }
}
