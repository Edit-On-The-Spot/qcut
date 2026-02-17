import "./style.css"
import { createLayout } from "./components/layout"
import { initRouter } from "./router"
import { preloadFFmpeg } from "./lib/ffmpeg-loader"

declare const __BUILD_TIME__: string

// Log build information
console.log(`[Qcut] Build time: ${__BUILD_TIME__}`)
console.log(`[Qcut] Environment: ${import.meta.env.MODE}`)

// Mount layout shell
const app = document.getElementById("app")!
const layout = createLayout()
app.appendChild(layout.element)

// Start routing
initRouter()

// Preload FFmpeg in background
preloadFFmpeg()
