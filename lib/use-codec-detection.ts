"use client"

import { useState, useCallback, useEffect } from "react"
import { useFFmpeg, useVideo } from "./video-context"

interface CodecInfo {
  videoCodec: string | null
  audioCodec: string | null
  container: string | null
}

/**
 * Hook for detecting video and audio codecs using FFmpeg.
 * Parses FFmpeg log output when running -i on the input file.
 */
export function useCodecDetection() {
  const { ffmpeg, isLoaded } = useFFmpeg()
  const { videoData } = useVideo()
  const [codecInfo, setCodecInfo] = useState<CodecInfo | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Log state changes for debugging
  useEffect(() => {
    console.log("[CodecDetection] State - isLoaded:", isLoaded, "videoData:", !!videoData, "ffmpeg:", !!ffmpeg)
  }, [isLoaded, videoData, ffmpeg])

  /**
   * Detects codecs by running FFmpeg with -i and parsing the log output.
   * FFmpeg outputs stream info to stderr which we capture via the log event.
   */
  const detectCodecs = useCallback(async (): Promise<CodecInfo | null> => {
    console.log("[CodecDetection] detectCodecs called, ffmpeg:", !!ffmpeg, "isLoaded:", isLoaded, "videoData:", !!videoData)
    if (!ffmpeg || !isLoaded || !videoData) {
      console.log("[CodecDetection] FFmpeg not loaded or no video data - skipping detection")
      return null
    }

    setIsDetecting(true)
    setError(null)

    try {
      // Write the video file to FFmpeg's virtual filesystem
      // Always read fresh from File to avoid detached ArrayBuffer issues
      const buffer = await videoData.file.arrayBuffer()
      const uint8Array = new Uint8Array(buffer)

      const inputFileName = "probe_input.mp4"
      await ffmpeg.writeFile(inputFileName, uint8Array)

      // Collect log messages
      const logMessages: string[] = []
      const logHandler = ({ message }: { message: string }) => {
        logMessages.push(message)
      }
      ffmpeg.on("log", logHandler)

      try {
        // Run ffmpeg -i which will output stream info and exit with error (no output specified)
        // This is expected to fail but we get the stream info from logs
        await ffmpeg.exec(["-i", inputFileName])
      } catch {
        // Expected to fail - we just want the log output
      }

      ffmpeg.off("log", logHandler)

      // Parse the log output to find codec information
      // Example log lines:
      // "Stream #0:0: Video: h264 (High), yuv420p, 1920x1080, ..."
      // "Stream #0:1: Audio: aac (LC), 48000 Hz, stereo, fltp, ..."
      const info: CodecInfo = {
        videoCodec: null,
        audioCodec: null,
        container: null,
      }

      const fullLog = logMessages.join("\n")
      console.log("[CodecDetection] FFmpeg log output:", fullLog)

      // Parse video codec
      const videoMatch = fullLog.match(/Stream #\d+:\d+.*Video:\s*(\w+)/i)
      if (videoMatch) {
        info.videoCodec = videoMatch[1].toLowerCase()
        console.log("[CodecDetection] Detected video codec:", info.videoCodec)
      }

      // Parse audio codec
      const audioMatch = fullLog.match(/Stream #\d+:\d+.*Audio:\s*(\w+)/i)
      if (audioMatch) {
        info.audioCodec = audioMatch[1].toLowerCase()
        console.log("[CodecDetection] Detected audio codec:", info.audioCodec)
      }

      // Parse container format
      const containerMatch = fullLog.match(/Input #\d+,\s*(\w+)/i)
      if (containerMatch) {
        info.container = containerMatch[1].toLowerCase()
        console.log("[CodecDetection] Detected container:", info.container)
      }

      // Clean up
      try {
        await ffmpeg.deleteFile(inputFileName)
      } catch {
        // Ignore cleanup errors
      }

      setCodecInfo(info)
      return info
    } catch (err) {
      const errorMessage = (err as Error).message
      console.error("[CodecDetection] Error:", errorMessage)
      setError(errorMessage)
      return null
    } finally {
      setIsDetecting(false)
    }
  }, [ffmpeg, isLoaded, videoData])

  return {
    codecInfo,
    isDetecting,
    error,
    detectCodecs,
    isReady: isLoaded && !!videoData,
  }
}
