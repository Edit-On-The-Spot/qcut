"use client"

import { atom, useAtom } from "jotai"
import { FFmpeg } from "@ffmpeg/ffmpeg"

export type ActionType =
  | "convert"
  | "compress"
  | "trim"
  | "extract-audio"
  | "merge"
  | "gif"
  | "resize"
  | "frame-extract"
  | "combine"
  | "normalize-audio"
  | "rotate"
  | "overlay"

export interface VideoData {
  file: File
  fileData?: Uint8Array
  duration?: number
  width?: number
  height?: number
  codec?: string
  format?: string
}

export interface ActionConfig {
  type: ActionType
  params: Record<string, any>
}

/** Atom storing the current video file data and metadata */
export const videoDataAtom = atom<VideoData | null>(null)

/** Atom storing the selected action configuration */
export const actionConfigAtom = atom<ActionConfig | null>(null)

/** Atom storing the FFmpeg instance */
export const ffmpegAtom = atom<FFmpeg | null>(null)

/** Atom tracking whether FFmpeg is loaded */
export const ffmpegLoadedAtom = atom<boolean>(false)

/** Atom tracking FFmpeg loading progress message */
export const ffmpegMessageAtom = atom<string>("")

/** Atom caching generated thumbnails by timestamp key (videoName:timestampMs -> dataUrl) */
export const thumbnailCacheAtom = atom<Map<string, string>>(new Map())

/** Atom tracking whether video processing is in progress */
export const isProcessingAtom = atom<boolean>(false)

/** Atom storing abort controller for cancelling processing */
export const processingAbortControllerAtom = atom<AbortController | null>(null)

/**
 * Hook to access video editing state.
 * Uses Jotai atoms for state management across routes.
 */
export function useVideo() {
  const [videoData, setVideoData] = useAtom(videoDataAtom)
  const [actionConfig, setActionConfig] = useAtom(actionConfigAtom)

  const reset = () => {
    setVideoData(null)
    setActionConfig(null)
  }

  return { videoData, setVideoData, actionConfig, setActionConfig, reset }
}

/**
 * Hook to access FFmpeg instance and loading state.
 * Uses Jotai atoms for state management.
 * Loads FFmpeg on first call if not already loaded.
 */
export function useFFmpeg() {
  const [ffmpeg, setFFmpeg] = useAtom(ffmpegAtom)
  const [isLoaded, setIsLoaded] = useAtom(ffmpegLoadedAtom)
  const [message, setMessage] = useAtom(ffmpegMessageAtom)

  const load = async () => {
    if (isLoaded || ffmpeg) return

    try {
      setMessage("Loading Qcut...")
      const ffmpegInstance = new FFmpeg()

      ffmpegInstance.on("log", ({ message: logMessage }) => {
        console.log(logMessage)
      })

      await ffmpegInstance.load()

      setFFmpeg(ffmpegInstance)
      setIsLoaded(true)
      setMessage("FFmpeg loaded successfully!")
    } catch (error) {
      setMessage(`Error loading FFmpeg: ${(error as Error).message}`)
      console.error("FFmpeg loading error:", error)
      throw error
    }
  }

  return { ffmpeg, isLoaded, message, load }
}

/**
 * Hook to access global processing state.
 * Used to track if processing is in progress and to cancel it.
 */
export function useProcessingState() {
  const [isProcessing, setIsProcessing] = useAtom(isProcessingAtom)
  const [abortController, setAbortController] = useAtom(processingAbortControllerAtom)
  const [ffmpeg, setFFmpeg] = useAtom(ffmpegAtom)
  const [, setIsLoaded] = useAtom(ffmpegLoadedAtom)

  /**
   * Starts processing and creates an abort controller.
   * @returns The abort signal to pass to async operations
   */
  const startProcessing = () => {
    const controller = new AbortController()
    setAbortController(controller)
    setIsProcessing(true)
    return controller.signal
  }

  /**
   * Stops processing and terminates FFmpeg if running.
   * Call this when navigating away or user cancels.
   * Also resets FFmpeg state so it will reload on next use.
   */
  const cancelProcessing = async () => {
    console.log("[Processing] Cancelling processing...")
    if (abortController) {
      abortController.abort()
      setAbortController(null)
    }
    if (ffmpeg) {
      try {
        // Terminate will stop any running FFmpeg operation
        ffmpeg.terminate()
        console.log("[Processing] FFmpeg terminated")
      } catch (err) {
        console.warn("[Processing] Error terminating FFmpeg:", err)
      }
      // Reset FFmpeg state so it will reload on next use
      setFFmpeg(null)
      setIsLoaded(false)
      console.log("[Processing] FFmpeg state reset, will reload on next operation")
    }
    setIsProcessing(false)
  }

  /**
   * Marks processing as complete.
   */
  const finishProcessing = () => {
    setAbortController(null)
    setIsProcessing(false)
  }

  return {
    isProcessing,
    startProcessing,
    cancelProcessing,
    finishProcessing,
  }
}
