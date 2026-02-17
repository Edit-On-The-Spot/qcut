import { getState } from "../store"
import { createLogger } from "./logger"

const log = createLogger("codec-detection")

/** Maps detected codec names to human-readable display names. */
export const CODEC_DISPLAY_NAMES: Record<string, string> = {
  h264: "H.264",
  hevc: "H.265/HEVC",
  h265: "H.265/HEVC",
  vp9: "VP9",
  vp8: "VP8",
  av1: "AV1",
  mpeg4: "MPEG-4",
  mpeg2video: "MPEG-2",
}

export interface CodecInfo {
  videoCodec: string | null
  audioCodec: string | null
  container: string | null
}

/**
 * Detects video and audio codecs by running FFmpeg with -i and parsing the log output.
 * FFmpeg outputs stream info to stderr which we capture via the log event.
 * Returns null if FFmpeg is not loaded or no video data is available.
 */
export async function detectCodecs(): Promise<CodecInfo | null> {
  const { ffmpeg, isFFmpegLoaded, videoData } = getState()

  log.debug("detectCodecs called - ffmpeg: %s, isLoaded: %s, videoData: %s", !!ffmpeg, isFFmpegLoaded, !!videoData)

  if (!ffmpeg || !isFFmpegLoaded || !videoData) {
    log.debug("FFmpeg not loaded or no video data - skipping detection")
    return null
  }

  const buffer = await videoData.file.arrayBuffer()
  const uint8Array = new Uint8Array(buffer)

  const inputFileName = "probe_input.mp4"
  await ffmpeg.writeFile(inputFileName, uint8Array)

  const logMessages: string[] = []
  const logHandler = ({ message }: { message: string }) => {
    logMessages.push(message)
  }
  ffmpeg.on("log", logHandler)

  try {
    // Run ffmpeg -i which outputs stream info and exits with error (no output specified).
    // The failure is expected; we only need the log output.
    await ffmpeg.exec(["-i", inputFileName])
  } catch {
    // Expected to fail - we just want the log output
  }

  ffmpeg.off("log", logHandler)

  const info: CodecInfo = {
    videoCodec: null,
    audioCodec: null,
    container: null,
  }

  const fullLog = logMessages.join("\n")
  log.debug("FFmpeg log output: %s", fullLog)

  // Parse video codec from lines like:
  // "Stream #0:0: Video: h264 (High), yuv420p, 1920x1080, ..."
  const videoMatch = fullLog.match(/Stream #\d+:\d+.*Video:\s*(\w+)/i)
  if (videoMatch) {
    info.videoCodec = videoMatch[1].toLowerCase()
    log.debug("Detected video codec: %s", info.videoCodec)
  }

  // Parse audio codec from lines like:
  // "Stream #0:1: Audio: aac (LC), 48000 Hz, stereo, fltp, ..."
  const audioMatch = fullLog.match(/Stream #\d+:\d+.*Audio:\s*(\w+)/i)
  if (audioMatch) {
    info.audioCodec = audioMatch[1].toLowerCase()
    log.debug("Detected audio codec: %s", info.audioCodec)
  }

  // Parse container format from lines like:
  // "Input #0, mov,mp4,m4a,3gp,3g2,mj2, from ..."
  const containerMatch = fullLog.match(/Input #\d+,\s*(\w+)/i)
  if (containerMatch) {
    info.container = containerMatch[1].toLowerCase()
    log.debug("Detected container: %s", info.container)
  }

  try {
    await ffmpeg.deleteFile(inputFileName)
  } catch {
    // Ignore cleanup errors
  }

  return info
}
