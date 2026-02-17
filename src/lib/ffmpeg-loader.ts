import { loadFFmpeg } from "../store"
import { createLogger } from "./logger"

const log = createLogger("ffmpeg-loader")

/** Preloads FFmpeg in the background. Call once from main.ts on app start. */
export function preloadFFmpeg(): void {
  log.info("Initiating FFmpeg preload")
  loadFFmpeg()
    .then(() => log.info("FFmpeg preload complete"))
    .catch((err) => log.error("FFmpeg preload failed:", err))
}
