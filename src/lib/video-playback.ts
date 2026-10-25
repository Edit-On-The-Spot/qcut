import { createLogger } from "./logger"

const log = createLogger("video-playback")

/** Shown when the browser cannot open the selected file at all. */
export const UNSUPPORTED_VIDEO_MESSAGE =
  "Unable to load video. Your browser can't open this file's format or codec (for example HEVC/H.265 or ProRes, common on iPhones and cameras). Convert it to an H.264 MP4 or try another browser."

/** Shown over a player whose picture the browser cannot decode. */
const UNDECODABLE_PICTURE_MESSAGE =
  "Your browser can't display this video's picture (often HEVC/H.265 or ProRes). Processing may still work, or convert it to an H.264 MP4 to preview it."

/**
 * Returns the media error code and message for the logger. The user-facing text
 * stays generic, so the raw browser detail is kept here for diagnosis.
 */
export function describeMediaError(video: HTMLVideoElement): string {
  const error = video.error
  return error ? `code ${error.code}: ${error.message || "no message"}` : "no MediaError"
}

/**
 * Overlays a notice on a preview player when the browser cannot decode the video.
 * Without it an unsupported codec leaves a silent black player whose Play button
 * appears to do nothing, because the browser either fires an error event or
 * loads metadata with a 0x0 video track (audio only).
 */
export function watchVideoPlayback(video: HTMLVideoElement, wrapper: HTMLElement): void {
  const showNotice = (): void => {
    if (wrapper.querySelector("[data-playback-notice]")) return
    const notice = document.createElement("div")
    notice.dataset.playbackNotice = ""
    notice.className = "absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-white bg-black/80"
    notice.textContent = UNDECODABLE_PICTURE_MESSAGE
    wrapper.appendChild(notice)
  }

  video.addEventListener("error", () => {
    // Clearing src on destroy also fires error with an empty source; ignore that.
    if (!video.getAttribute("src")) return
    log.warn("Preview cannot play video: %s", describeMediaError(video))
    showNotice()
  })
  video.addEventListener("loadedmetadata", () => {
    if (video.videoWidth === 0 && video.videoHeight === 0) {
      log.warn("Preview loaded metadata without a decodable video track")
      showNotice()
    }
  })
}

/**
 * Starts playback and logs a rejected play() instead of leaving it unhandled.
 * The player's error listener (see watchVideoPlayback) shows the user-facing notice.
 */
export function playVideo(video: HTMLVideoElement): void {
  video.play().catch((err: unknown) => {
    log.warn("play() rejected: %s (%s)", err instanceof Error ? err.message : String(err), describeMediaError(video))
  })
}
