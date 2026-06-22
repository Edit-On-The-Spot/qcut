import type { FFmpeg } from "@ffmpeg/ffmpeg"
import type { VideoData } from "./types"
import { createLogger } from "./lib/logger"

const log = createLogger("store")

type Listener = () => void

const listeners = new Set<Listener>()

// VideoData stored at module level — set synchronously before navigation
let videoData: VideoData | null = null

// In-flight read of the current video's bytes, deduped so the file is read at
// most once. Reset whenever the video changes (see setVideoData/resetVideo).
let videoBytesPromise: Promise<Uint8Array> | null = null

const state = {
  ffmpeg: null as FFmpeg | null,
  isFFmpegLoaded: false,
  ffmpegMessage: "",
  thumbnailCache: new Map<string, string>(),
  isProcessing: false,
  processingAbortController: null as AbortController | null,
}

/** Returns a snapshot of the current app state. */
export function getState(): Readonly<typeof state> {
  return state
}

/** Returns the current video data. */
export function getVideoData(): VideoData | null {
  return videoData
}

/** Sets the video data. */
export function setVideoData(data: VideoData | null): void {
  videoData = data
  videoBytesPromise = null
}

/**
 * Returns the loaded video's bytes, reading the underlying File at most once and
 * caching the result on videoData.fileData.
 *
 * The File reference is only read here, at load time, and never again. Reading a
 * File a second time at processing time can throw a NotReadableError DOMException
 * when the underlying file has moved, been replaced, lost its permission handle,
 * or is being read concurrently — the failure reported in GitHub issue #2. Keeping
 * the bytes in memory after the first successful read avoids that stale re-read.
 */
export function ensureVideoBytes(): Promise<Uint8Array> {
  const current = videoData
  if (!current) {
    return Promise.reject(new Error("No video is loaded yet. Please select a video first."))
  }
  if (current.fileData) {
    return Promise.resolve(current.fileData)
  }
  if (videoBytesPromise) {
    return videoBytesPromise
  }

  const file = current.file
  videoBytesPromise = file
    .arrayBuffer()
    .then((buffer) => {
      const bytes = new Uint8Array(buffer)
      // Cache the bytes only if the same file is still loaded.
      if (videoData && videoData.file === file) {
        videoData.fileData = bytes
      }
      return bytes
    })
    .catch((err) => {
      // Allow a later retry to start a fresh read.
      videoBytesPromise = null
      throw normalizeVideoReadError(err)
    })

  return videoBytesPromise
}

/**
 * Converts a raw File read failure into a clear, actionable message. The browser's
 * NotReadableError text ("The requested file could not be read...") does not tell
 * the user how to recover, so we explain that the file changed and to re-select it.
 */
function normalizeVideoReadError(err: unknown): Error {
  if (err instanceof DOMException && err.name === "NotReadableError") {
    return new Error(
      "The video file could not be read. It may have been moved, renamed, edited, or deleted since you selected it. Please re-select the video and try again."
    )
  }
  return err instanceof Error ? err : new Error(String(err))
}

/** Merges partial state updates and notifies subscribers. */
export function setState(partial: Partial<typeof state>): void {
  Object.assign(state, partial)
  listeners.forEach((fn) => fn())
}

/** Subscribes to state changes. Returns an unsubscribe function. */
export function subscribe(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Resets video data and thumbnail cache. */
export function resetVideo(): void {
  log.info("Resetting video state")
  setVideoData(null)
  state.thumbnailCache = new Map()
  log.debug("Thumbnail cache cleared")
  listeners.forEach((fn) => fn())
}

// ── FFmpeg singleton ──

let ffmpegLoadPromise: Promise<void> | null = null

/** Loads FFmpeg if not already loaded. Reuses a singleton instance. */
export async function loadFFmpeg(): Promise<void> {
  if (state.ffmpeg && state.isFFmpegLoaded) {
    log.debug("FFmpeg already loaded")
    return
  }

  if (ffmpegLoadPromise) {
    log.debug("Load already in progress, waiting")
    await ffmpegLoadPromise
    return
  }

  setState({ ffmpegMessage: "Loading Qcut..." })
  log.info("Starting FFmpeg load")

  ffmpegLoadPromise = (async () => {
    const { FFmpeg } = await import("@ffmpeg/ffmpeg")
    const instance = new FFmpeg()
    instance.on("log", ({ message }) => {
      log.debug("FFmpeg: %s", message)
    })
    await instance.load()
    setState({
      ffmpeg: instance,
      isFFmpegLoaded: true,
      ffmpegMessage: "FFmpeg loaded successfully!",
    })
    log.info("FFmpeg loaded successfully")
  })()

  try {
    await ffmpegLoadPromise
  } catch (error) {
    ffmpegLoadPromise = null
    setState({ ffmpegMessage: `Error loading FFmpeg: ${(error as Error).message}` })
    log.error("FFmpeg loading error:", error)
    throw error
  }
}

// ── Processing state helpers ──

/** Starts processing and creates an abort controller. Returns the abort signal. */
export function startProcessing(): AbortSignal {
  const controller = new AbortController()
  setState({ processingAbortController: controller, isProcessing: true })
  return controller.signal
}

/** Cancels processing, terminates FFmpeg, and resets processing state. */
export async function cancelProcessing(): Promise<void> {
  log.info("Cancelling processing")
  const { processingAbortController, ffmpeg } = state

  if (processingAbortController) {
    processingAbortController.abort()
  }

  if (ffmpeg) {
    try {
      ffmpeg.terminate()
      log.info("FFmpeg terminated")
    } catch (err) {
      log.warn("Error terminating FFmpeg:", err)
    }
    ffmpegLoadPromise = null
    log.debug("FFmpeg state reset, will reload on next operation")
  }

  setState({
    processingAbortController: null,
    isProcessing: false,
    ffmpeg: null,
    isFFmpegLoaded: false,
  })
}

/** Marks processing as complete without terminating FFmpeg. */
export function finishProcessing(): void {
  setState({ processingAbortController: null, isProcessing: false })
}
