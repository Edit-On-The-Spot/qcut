import JSZip from "jszip"
import type { ActionConfig } from "../types"
import { getState, startProcessing, finishProcessing, subscribe } from "../store"
import { createLogger } from "./logger"
import {
  trackProcessingStart,
  trackProcessingComplete,
  trackProcessingError,
  trackDownload,
} from "./analytics"
import { createGifWithGifenc, shouldUseGifenc, type GifProgress } from "./gif-encoder"

const log = createLogger("processor")

export interface ProcessorState {
  isProcessing: boolean
  isComplete: boolean
  progress: number
  processingStartTimeMs: number | null
  error: string | null
  outputUrl: string | null
}

type ProcessorListener = (state: ProcessorState) => void

/**
 * Video processor class that replaces the React useVideoProcessor hook.
 * Manages processing state, FFmpeg execution, and file download.
 */
export class VideoProcessor {
  private state: ProcessorState = {
    isProcessing: false,
    isComplete: false,
    progress: 0,
    processingStartTimeMs: null,
    error: null,
    outputUrl: null,
  }

  private listeners = new Set<ProcessorListener>()

  /** Returns the current processor state. */
  getState(): Readonly<ProcessorState> {
    return this.state
  }

  /** Subscribes to processor state changes. */
  subscribe(fn: ProcessorListener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn(this.state))
  }

  private setState(partial: Partial<ProcessorState>): void {
    Object.assign(this.state, partial)
    this.notify()
  }

  /** Returns true if FFmpeg is loaded. */
  get isLoaded(): boolean {
    return getState().isFFmpegLoaded
  }

  /** Processes the video with the given config. */
  async process(config: ActionConfig): Promise<void> {
    const appState = getState()
    const { videoData } = appState
    const isSingleFrameExtract = config.type === "frame-extract" && config.params.mode === "single"

    const isGifWithGifenc = config.type === "gif" && (() => {
      const startSec = Number.parseFloat(String(config.params.start || "0"))
      const endSec = Number.parseFloat(String(config.params.end || "3"))
      return shouldUseGifenc(endSec - startSec)
    })()

    if (!videoData) {
      this.setState({ error: "No video is loaded yet. Please select a video first." })
      return
    }
    if (!isSingleFrameExtract && !isGifWithGifenc && (!appState.ffmpeg || !appState.isFFmpegLoaded)) {
      this.setState({ error: "FFmpeg is not loaded yet. Please wait." })
      return
    }

    startProcessing()
    this.setState({
      isProcessing: true,
      progress: 0,
      error: null,
      isComplete: false,
      outputUrl: null,
      processingStartTimeMs: performance.now(),
    })
    trackProcessingStart(config.type)

    const processingStartMs = performance.now()

    try {
      if (isSingleFrameExtract) {
        await this.extractSingleFrame(config, videoData, processingStartMs)
        return
      }

      if (isGifWithGifenc) {
        await this.createGifWithGifenc(config, videoData, processingStartMs)
        return
      }

      await this.processWithFFmpeg(config, videoData, processingStartMs)
    } catch (err) {
      const errorMessage = (err as Error).message
      trackProcessingError(config.type, errorMessage)
      this.setState({ error: `Error processing video: ${errorMessage}` })
    } finally {
      finishProcessing()
      this.setState({ isProcessing: false })
    }
  }

  private async extractSingleFrame(
    config: ActionConfig,
    videoData: NonNullable<typeof getState extends () => infer S ? S extends { videoData: infer V } ? V : never : never>,
    processingStartMs: number
  ): Promise<void> {
    log.info("Starting single frame extraction")
    const timestampSec = Math.max(0, Number.parseFloat(String(config.params.timestamp || "0")))
    const format = String(config.params.format || "png")
    const mimeType = this.getMimeType(format)

    const objectUrl = URL.createObjectURL(videoData.file)
    try {
      const video = document.createElement("video")
      video.preload = "auto"
      video.muted = true
      video.src = objectUrl

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Timeout waiting for video metadata.")), 30000)
        video.addEventListener("loadedmetadata", () => { clearTimeout(timeout); resolve() }, { once: true })
        video.addEventListener("error", () => { clearTimeout(timeout); reject(new Error("Failed to load video.")) }, { once: true })
      })

      const targetTime = Math.min(timestampSec, Math.max(0, video.duration || timestampSec))
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Timeout seeking to frame.")), 60000)
        video.addEventListener("seeked", () => {
          clearTimeout(timeout)
          const fallback = setTimeout(() => resolve(), 500)
          if ("requestVideoFrameCallback" in video) {
            video.requestVideoFrameCallback(() => { clearTimeout(fallback); resolve() })
          } else {
            clearTimeout(fallback)
            resolve()
          }
        }, { once: true })
        video.addEventListener("error", () => { clearTimeout(timeout); reject(new Error("Failed to seek.")) }, { once: true })
        video.currentTime = targetTime
      })

      const canvas = document.createElement("canvas")
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Unable to render frame.")
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      const blob = await new Promise<Blob>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Timeout encoding frame.")), 30000)
        canvas.toBlob((result) => {
          clearTimeout(timeout)
          if (!result) { reject(new Error("Failed to encode frame.")); return }
          resolve(result)
        }, mimeType)
      })

      const url = URL.createObjectURL(blob)
      this.revokeOutputUrl()
      this.setState({ outputUrl: url, progress: 100, isComplete: true, processingStartTimeMs: null })

      const durationMs = Math.round(performance.now() - processingStartMs)
      trackProcessingComplete(config.type, durationMs)

      this.triggerDownload(url, `${videoData.file.name.replace(/\.[^/.]+$/, "")}_frame.${format}`)
      trackDownload(config.type, blob.size / (1024 * 1024))
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  }

  private async createGifWithGifenc(
    config: ActionConfig,
    videoData: NonNullable<ReturnType<typeof getState>["videoData"]>,
    processingStartMs: number
  ): Promise<void> {
    log.info("Using gifenc for fast GIF creation")
    const startSec = Number.parseFloat(String(config.params.start || "0"))
    const endSec = Number.parseFloat(String(config.params.end || "3"))
    const fps = Number(config.params.fps) || 10
    const width = Number(config.params.scale) || 480

    const handleProgress = (p: GifProgress) => {
      if (p.phase === "extracting") {
        this.setState({ progress: Math.round((p.current / p.total) * 60) })
      } else {
        this.setState({ progress: 60 + Math.round((p.current / p.total) * 40) })
      }
    }

    const blob = await createGifWithGifenc(videoData.file, { startSec, endSec, fps, width }, handleProgress)
    const url = URL.createObjectURL(blob)
    this.revokeOutputUrl()
    this.setState({ outputUrl: url, progress: 100, isComplete: true, processingStartTimeMs: null })

    const durationMs = Math.round(performance.now() - processingStartMs)
    trackProcessingComplete(config.type, durationMs)
    this.triggerDownload(url, `${videoData.file.name.replace(/\.[^/.]+$/, "")}_${config.type}.gif`)
    trackDownload(config.type, blob.size / (1024 * 1024))
  }

  private async processWithFFmpeg(
    config: ActionConfig,
    videoData: NonNullable<ReturnType<typeof getState>["videoData"]>,
    processingStartMs: number
  ): Promise<void> {
    const ffmpeg = getState().ffmpeg!
    ffmpeg.on("progress", ({ progress: prog }) => {
      this.setState({ progress: Math.round(prog * 100) })
    })

    log.info("Starting processing for: %s", config.type)
    const buffer = await videoData.file.arrayBuffer()
    const uint8Array = new Uint8Array(buffer)
    const inputFileName = "input.mp4"
    await ffmpeg.writeFile(inputFileName, uint8Array)

    if (config.type === "merge") {
      const audioFile = config.params.audioFile as File | undefined
      if (!audioFile) throw new Error("Select an audio file to merge before processing.")
      await ffmpeg.writeFile("audio.input", new Uint8Array(await audioFile.arrayBuffer()))
    }

    if (config.type === "combine") {
      const clips = config.params.clips as File[] | undefined
      if (!clips || clips.length < 2) throw new Error("Add at least two clips to combine before processing.")
      const clipNames: string[] = []
      for (let i = 0; i < clips.length; i++) {
        const ext = clips[i].name.split(".").pop()
        const name = `clip_${i}${ext ? `.${ext}` : ""}`
        await ffmpeg.writeFile(name, new Uint8Array(await clips[i].arrayBuffer()))
        clipNames.push(name)
      }
      await ffmpeg.writeFile("concat.txt", new TextEncoder().encode(clipNames.map((n) => `file '${n}'`).join("\n")))
    }

    if (config.type === "overlay" && config.params.overlayFile) {
      await ffmpeg.writeFile("overlay.png", new Uint8Array(await (config.params.overlayFile as File).arrayBuffer()))
    }

    const outputExt = this.getOutputExtension(config)
    const outputFileName = `output.${outputExt}`
    const args = buildFFmpegArgs(config, inputFileName, outputFileName, videoData.duration)

    log.info("Running FFmpeg with args: %o", args)
    await ffmpeg.exec(args)

    let url: string
    if (config.type === "frame-extract" && config.params.mode !== "single") {
      const format = String(config.params.format || "png")
      const entries = await ffmpeg.listDir("/")
      const frameFiles = entries
        .filter((e: { name: string; type?: string }) => e.type === "file")
        .map((e: { name: string }) => e.name)
        .filter((n: string) => n.startsWith("frame_") && n.endsWith(`.${format}`))
        .sort()
      if (frameFiles.length === 0) throw new Error("No frames were generated.")

      const zip = new JSZip()
      for (const name of frameFiles) {
        const data = await ffmpeg.readFile(name)
        zip.file(name, data instanceof Uint8Array ? data.slice().buffer : data)
      }
      url = URL.createObjectURL(await zip.generateAsync({ type: "blob" }))
    } else {
      const outputData = await ffmpeg.readFile(outputFileName)
      const blobData = outputData instanceof Uint8Array ? outputData.slice().buffer : outputData
      url = URL.createObjectURL(new Blob([blobData], { type: this.getMimeType(outputExt) }))
    }

    this.revokeOutputUrl()
    this.setState({ outputUrl: url, progress: 100, isComplete: true, processingStartTimeMs: null })
    const durationMs = Math.round(performance.now() - processingStartMs)
    trackProcessingComplete(config.type, durationMs)
    this.triggerDownload(url, `${videoData.file.name.replace(/\.[^/.]+$/, "")}_${config.type}.${outputExt}`)
    fetch(url).then((r) => r.blob()).then((b) => trackDownload(config.type, b.size / (1024 * 1024))).catch(() => trackDownload(config.type, 0))
  }

  /** Triggers a file download via a temporary <a> element. */
  download(config: ActionConfig): void {
    if (!this.state.outputUrl) return
    const ext = this.getOutputExtension(config)
    const videoData = getState().videoData
    const name = `${videoData?.file.name.replace(/\.[^/.]+$/, "") || "output"}_${config.type}.${ext}`
    this.triggerDownload(this.state.outputUrl, name)
  }

  /** Resets processor state without resetting video. */
  reset(): void {
    this.revokeOutputUrl()
    finishProcessing()
    this.setState({ isComplete: false, progress: 0, outputUrl: null, error: null, processingStartTimeMs: null })
  }

  private triggerDownload(url: string, filename: string): void {
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
  }

  private revokeOutputUrl(): void {
    if (this.state.outputUrl) {
      URL.revokeObjectURL(this.state.outputUrl)
    }
  }

  private getOutputExtension(config: ActionConfig): string {
    switch (config.type) {
      case "convert": return String(config.params.format || "mp4")
      case "extract-audio":
        if (config.params.extractMode === "video") return String(config.params.videoFormat || "mp4")
        return String(config.params.format || "mp3")
      case "gif": return "gif"
      case "frame-extract": return config.params.mode === "single" ? String(config.params.format || "png") : "zip"
      default: return "mp4"
    }
  }

  private getMimeType(ext: string): string {
    const map: Record<string, string> = {
      mp4: "video/mp4", webm: "video/webm", avi: "video/x-msvideo", mov: "video/quicktime", mkv: "video/x-matroska",
      mp3: "audio/mpeg", wav: "audio/wav", aac: "audio/aac", flac: "audio/flac", ogg: "audio/ogg",
      gif: "image/gif", png: "image/png", jpg: "image/jpeg", webp: "image/webp", zip: "application/zip",
    }
    return map[ext] || "application/octet-stream"
  }
}

/** Builds FFmpeg command-line arguments for a given action config. */
export function buildFFmpegArgs(config: ActionConfig, input: string, output: string, duration?: number): string[] {
  switch (config.type) {
    case "trim": {
      const startSec = Number.parseFloat(String(config.params.start || "0"))
      const endSec = Number.parseFloat(String(config.params.end || String(duration || 0)))
      return ["-ss", String(startSec), "-t", String(Math.max(0, endSec - startSec)), "-i", input, "-c", "copy", output]
    }
    case "convert": {
      const codec = String(config.params.codec || "libx264")
      return codec === "copy" ? ["-i", input, "-c", "copy", output] : ["-i", input, "-c:v", codec, "-c:a", "copy", output]
    }
    case "compress":
      return ["-i", input, "-vcodec", "libx264", "-crf", String(config.params.crf || 23), "-preset", String(config.params.preset || "medium"), "-c:a", "copy", output]
    case "extract-audio":
      if (config.params.extractMode === "video") return ["-i", input, "-an", "-c:v", "copy", output]
      return ["-i", input, "-vn", "-acodec", config.params.format === "mp3" ? "libmp3lame" : "aac", "-b:a", String(config.params.bitrate || "192k"), output]
    case "gif":
      return ["-i", input, "-ss", String(config.params.start || "0"), "-t", String(Number.parseFloat(String(config.params.end || "3")) - Number.parseFloat(String(config.params.start || "0"))), "-vf", `fps=${config.params.fps || 10},scale=${config.params.scale || 480}:-1:flags=lanczos`, output]
    case "resize":
      return ["-i", input, "-vf", `scale=${config.params.width || -1}:${config.params.height || -1}`, "-c:v", "libx264", "-c:a", "copy", output]
    case "frame-extract": {
      const format = String(config.params.format || "png")
      if (config.params.mode === "single") return ["-ss", String(config.params.timestamp || "0"), "-i", input, "-frames:v", "1", output]
      const interval = Number.parseFloat(String(config.params.interval || "1"))
      if (config.params.mode === "interval" && interval > 0) return ["-i", input, "-vf", `fps=1/${interval}`, `frame_%04d.${format}`]
      return ["-i", input, "-vsync", "0", `frame_%04d.${format}`]
    }
    case "normalize-audio":
      return ["-i", input, "-af", `loudnorm=I=${config.params.targetLoudnessLufs || -16}:TP=${config.params.truePeakDb || -1.5}:LRA=${config.params.loudnessRangeLu || 11}`, "-c:v", "copy", "-c:a", "aac", output]
    case "rotate": {
      const rotation = Number(config.params.rotation || 0)
      const hasFlip = config.params.isFlipHorizontal || config.params.isFlipVertical
      if (config.params.isLosslessFormat && !hasFlip) {
        if (rotation === 0) return ["-i", input, "-c", "copy", output]
        return ["-i", input, "-c", "copy", "-metadata:s:v", `rotate=${rotation}`, output]
      }
      const filters: string[] = []
      if (rotation === 90) filters.push("transpose=1")
      else if (rotation === 180) filters.push("transpose=1,transpose=1")
      else if (rotation === 270) filters.push("transpose=2")
      if (config.params.isFlipHorizontal) filters.push("hflip")
      if (config.params.isFlipVertical) filters.push("vflip")
      if (filters.length === 0) return ["-i", input, "-c", "copy", output]
      return ["-i", input, "-vf", filters.join(","), "-c:v", "libx264", "-c:a", "copy", output]
    }
    case "merge":
      return ["-i", input, "-i", "audio.input", "-map", "0:v:0", "-map", "1:a:0", "-shortest", "-c:v", "copy", "-c:a", "aac", output]
    case "combine":
      return ["-f", "concat", "-safe", "0", "-i", "concat.txt", "-c", "copy", output]
    case "overlay": {
      const position = String(config.params.position || "top-left")
      const scalePct = Number(config.params.scalePct || 100)
      const opacityPct = Number(config.params.opacityPct || 100)
      const offsetX = Number(config.params.offsetX || 10)
      const offsetY = Number(config.params.offsetY || 10)
      let xExpr: string, yExpr: string
      switch (position) {
        case "top-right": xExpr = `W-w-${offsetX}`; yExpr = String(offsetY); break
        case "bottom-left": xExpr = String(offsetX); yExpr = `H-h-${offsetY}`; break
        case "bottom-right": xExpr = `W-w-${offsetX}`; yExpr = `H-h-${offsetY}`; break
        case "center": xExpr = "(W-w)/2"; yExpr = "(H-h)/2"; break
        default: xExpr = String(offsetX); yExpr = String(offsetY)
      }
      const scaleFilter = scalePct !== 100 ? `[1:v]scale=iw*${scalePct}/100:-1[ovr];` : ""
      const overlayInput = scalePct !== 100 ? "[ovr]" : "[1:v]"
      const opacityFilter = opacityPct !== 100 ? `format=rgba,colorchannelmixer=aa=${opacityPct / 100}` : ""
      const overlayInputWithOpacity = opacityFilter ? `${overlayInput}${opacityFilter}[ovr2];[0:v][ovr2]` : `[0:v]${overlayInput}`
      return ["-i", input, "-i", "overlay.png", "-filter_complex", `${scaleFilter}${overlayInputWithOpacity}overlay=${xExpr}:${yExpr}`, "-c:v", "libx264", "-c:a", "copy", output]
    }
    default:
      return ["-i", input, output]
  }
}
