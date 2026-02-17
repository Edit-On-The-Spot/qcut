const DEFAULT_FRAMERATE_FPS = 30

/**
 * Creates a framerate detector for a video element.
 * Uses requestVideoFrameCallback when available to measure frame timing,
 * collects 10 frames, calculates average interval, and derives fps (clamped 1-120).
 * Listens for play/pause events to start/stop measuring.
 * @param video - The HTMLVideoElement to measure
 * @returns Object with getFramerateFps getter and destroy cleanup function
 */
export function createVideoFramerate(video: HTMLVideoElement): {
  getFramerateFps: () => number
  destroy: () => void
} {
  let framerateFps = DEFAULT_FRAMERATE_FPS

  if (!("requestVideoFrameCallback" in video)) {
    return {
      getFramerateFps: () => framerateFps,
      destroy: () => {},
    }
  }

  const frameTimes: number[] = []
  let callbackId: number | null = null

  const measureFrame = (_now: number, metadata: VideoFrameCallbackMetadata): void => {
    frameTimes.push(metadata.mediaTime)

    if (frameTimes.length >= 10) {
      const intervals: number[] = []
      for (let i = 1; i < frameTimes.length; i++) {
        const interval = frameTimes[i] - frameTimes[i - 1]
        if (interval > 0) {
          intervals.push(interval)
        }
      }

      if (intervals.length > 0) {
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
        const estimatedFps = Math.round(1 / avgInterval)
        framerateFps = Math.max(1, Math.min(120, estimatedFps))
      }
      return
    }

    callbackId = video.requestVideoFrameCallback(measureFrame)
  }

  const handlePlay = (): void => {
    frameTimes.length = 0
    callbackId = video.requestVideoFrameCallback(measureFrame)
  }

  const handlePause = (): void => {
    if (callbackId !== null) {
      video.cancelVideoFrameCallback(callbackId)
      callbackId = null
    }
  }

  video.addEventListener("play", handlePlay)
  video.addEventListener("pause", handlePause)

  if (!video.paused) {
    handlePlay()
  }

  return {
    getFramerateFps: () => framerateFps,
    destroy: () => {
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
      if (callbackId !== null) {
        video.cancelVideoFrameCallback(callbackId)
      }
    },
  }
}
