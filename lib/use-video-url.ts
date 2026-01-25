"use client"

import { useState, useEffect } from "react"

/**
 * Hook that creates an object URL for a File and handles cleanup.
 * Uses URL.createObjectURL which does not load the file into memory -
 * it creates a reference that the browser can stream from disk.
 *
 * @param file - The file to create a URL for
 * @returns The object URL, or empty string if file is null
 */
export function useVideoUrl(file: File | null | undefined): string {
  const [videoUrl, setVideoUrl] = useState<string>("")

  useEffect(() => {
    if (!file) {
      setVideoUrl("")
      return
    }
    const url = URL.createObjectURL(file)
    setVideoUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  return videoUrl
}
