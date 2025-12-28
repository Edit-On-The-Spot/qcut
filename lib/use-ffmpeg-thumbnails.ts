"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useAtom } from "jotai"
import { thumbnailCacheAtom, type VideoData } from "./video-context"

const THUMBNAIL_WIDTH = 160
const THUMBNAIL_HEIGHT = 90
const PARALLEL_WORKERS = 4

/**
 * Generates a cache key for a thumbnail based on video name and timestamp.
 * @param videoName - Name of the video file
 * @param timestampSec - Timestamp in seconds
 * @returns Cache key string
 */
function getCacheKey(videoName: string, timestampSec: number): string {
  // Round to milliseconds to avoid floating point issues
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
  canvas.width = THUMBNAIL_WIDTH
  canvas.height = THUMBNAIL_HEIGHT
  const ctx = canvas.getContext("2d")!

  // Wait for video metadata to load
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve()
    video.onerror = () => reject(new Error("Failed to load video"))
  })

  return { video, canvas, ctx, isBusy: false }
}

/**
 * Generates a thumbnail at the specified timestamp using a worker.
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
 * Hook for generating video thumbnails using Canvas API with parallel workers.
 * Uses multiple hidden video elements to generate thumbnails in parallel.
 * @param videoData - The video data containing the file
 * @returns Object with thumbnails map, loading state, and generation function
 */
export function useFFmpegThumbnails(videoData: VideoData | null) {
  const [cache, setCache] = useAtom(thumbnailCacheAtom)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const workersRef = useRef<ThumbnailWorker[]>([])
  const videoUrlRef = useRef<string | null>(null)
  const pendingQueueRef = useRef<number[]>([])
  const isProcessingRef = useRef(false)

  // Create video URL and workers when video data changes
  useEffect(() => {
    if (!videoData) {
      // Cleanup workers
      workersRef.current.forEach(w => {
        w.video.src = ""
      })
      workersRef.current = []
      setIsReady(false)
      if (videoUrlRef.current) {
        URL.revokeObjectURL(videoUrlRef.current)
        videoUrlRef.current = null
      }
      return
    }

    const url = URL.createObjectURL(videoData.file)
    videoUrlRef.current = url
    setIsReady(false)

    // Create parallel workers
    const initWorkers = async () => {
      const workers: ThumbnailWorker[] = []
      for (let i = 0; i < PARALLEL_WORKERS; i++) {
        try {
          const worker = await createWorker(url)
          workers.push(worker)
        } catch (error) {
          console.error(`Failed to create worker ${i}:`, error)
        }
      }
      workersRef.current = workers
      setIsReady(workers.length > 0)
    }

    initWorkers()

    return () => {
      workersRef.current.forEach(w => {
        w.video.src = ""
      })
      workersRef.current = []
      setIsReady(false)
      URL.revokeObjectURL(url)
      videoUrlRef.current = null
    }
  }, [videoData])

  /**
   * Processes pending thumbnail requests using available workers.
   */
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || !videoData) return
    if (pendingQueueRef.current.length === 0) {
      setIsGenerating(false)
      return
    }

    isProcessingRef.current = true
    setIsGenerating(true)

    const workers = workersRef.current
    if (workers.length === 0) {
      isProcessingRef.current = false
      return
    }

    // Process in batches using all available workers
    while (pendingQueueRef.current.length > 0) {
      const batch: Array<{ timestamp: number; worker: ThumbnailWorker }> = []

      // Assign timestamps to available workers
      for (const worker of workers) {
        if (pendingQueueRef.current.length === 0) break
        if (!worker.isBusy) {
          const timestamp = pendingQueueRef.current.shift()!
          worker.isBusy = true
          batch.push({ timestamp, worker })
        }
      }

      if (batch.length === 0) break

      // Generate thumbnails in parallel
      const results = await Promise.all(
        batch.map(async ({ timestamp, worker }) => {
          try {
            const dataUrl = await generateThumbnail(worker, timestamp)
            return { timestamp, dataUrl }
          } catch (error) {
            console.error(`Error generating thumbnail at ${timestamp}:`, error)
            return { timestamp, dataUrl: null }
          } finally {
            worker.isBusy = false
          }
        })
      )

      // Update cache with results
      setCache(prev => {
        const newCache = new Map(prev)
        for (const { timestamp, dataUrl } of results) {
          if (dataUrl && videoData) {
            const key = getCacheKey(videoData.file.name, timestamp)
            newCache.set(key, dataUrl)
          }
        }
        return newCache
      })
    }

    isProcessingRef.current = false
    setIsGenerating(false)
  }, [videoData, setCache])

  /**
   * Cancels all pending thumbnail generation requests.
   * Useful when zoom level changes to avoid generating thumbnails
   * that are no longer needed.
   */
  const cancelPending = useCallback(() => {
    pendingQueueRef.current = []
    setIsGenerating(false)
  }, [])

  /**
   * Requests thumbnails for the given timestamps.
   * Thumbnails are generated asynchronously and cached.
   * @param timestampsSec - Array of timestamps in seconds
   */
  const requestThumbnails = useCallback((timestampsSec: number[]) => {
    if (!videoData) return

    // Filter out already cached timestamps
    const uncached = timestampsSec.filter(ts => {
      const key = getCacheKey(videoData.file.name, ts)
      return !cache.has(key)
    })

    if (uncached.length === 0) return

    // Add to queue, avoiding duplicates
    const currentQueue = new Set(pendingQueueRef.current)
    for (const ts of uncached) {
      if (!currentQueue.has(ts)) {
        pendingQueueRef.current.push(ts)
      }
    }

    processQueue()
  }, [videoData, cache, processQueue])

  /**
   * Gets cached thumbnails for the given timestamps.
   * @param timestampsSec - Array of timestamps in seconds
   * @returns Map of timestamp to data URL (only includes cached thumbnails)
   */
  const getThumbnails = useCallback((timestampsSec: number[]): Map<number, string> => {
    const result = new Map<number, string>()
    if (!videoData) return result

    for (const ts of timestampsSec) {
      const key = getCacheKey(videoData.file.name, ts)
      const cached = cache.get(key)
      if (cached) {
        result.set(ts, cached)
      }
    }

    return result
  }, [videoData, cache])

  return {
    isGenerating,
    pendingCount: pendingQueueRef.current.length,
    requestThumbnails,
    cancelPending,
    getThumbnails,
    isReady
  }
}
