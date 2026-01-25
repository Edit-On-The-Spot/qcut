"use client"

import { useEffect } from "react"
import { useFFmpeg } from "@/lib/video-context"

/**
 * Component that loads FFmpeg on mount.
 * Should be placed in the root layout to preload FFmpeg.
 */
export function FFmpegLoader() {
  const { load, isLoaded, ffmpeg } = useFFmpeg()

  useEffect(() => {
    console.log("[FFmpegLoader] Initiating FFmpeg load")
    load().then(() => {
      console.log("[FFmpegLoader] FFmpeg load complete")
    }).catch((err) => {
      console.error("[FFmpegLoader] FFmpeg load failed:", err)
    })
  }, [load])

  useEffect(() => {
    console.log("[FFmpegLoader] State - isLoaded:", isLoaded, "ffmpeg:", !!ffmpeg)
  }, [isLoaded, ffmpeg])

  return null
}
