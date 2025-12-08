"use client"

import { useEffect } from "react"
import { useFFmpeg } from "@/lib/video-context"

/**
 * Component that loads FFmpeg on mount.
 * Should be placed in the root layout to preload FFmpeg.
 */
export function FFmpegLoader() {
  const { load } = useFFmpeg()

  useEffect(() => {
    load()
  }, [load])

  return null
}
