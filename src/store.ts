import type { FFmpeg } from "@ffmpeg/ffmpeg"
import type { VideoData } from "./types"
import { createLogger } from "./lib/logger"

const log = createLogger("store")

type Listener = () => void

const listeners = new Set<Listener>()

// VideoData stored at module level — set synchronously before navigation
let videoData: VideoData | null = null

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
