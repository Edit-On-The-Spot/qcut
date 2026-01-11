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
      setMessage("Loading FFmpeg...")
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
