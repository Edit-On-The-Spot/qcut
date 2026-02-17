import type { RouteConfig, Component } from "./types"
import { getState, cancelProcessing } from "./store"
import { trackPageView } from "./lib/analytics"
import { createLogger } from "./lib/logger"

const log = createLogger("router")

/** Route table mapping path patterns to lazy-loaded page modules. */
const routes: Record<string, RouteConfig> = {
  "/": {
    title: "Qcut - Lightning-fast in-browser video editor",
    description: "Simple, powerful video editing powered by FFmpeg",
    load: () => import("./pages/home"),
  },
  "/actions": {
    title: "Choose Action - Qcut",
    description:
      "Select a video editing operation — trim, convert, compress, resize, extract audio, create GIFs, and more. Free browser-based video editor.",
    load: () => import("./pages/actions"),
  },
  "/trim": {
    title: "Trim & Cut Video - Qcut",
    description:
      "Cut and trim video segments directly in your browser. No upload required — fast, free, and private.",
    load: () => import("./pages/trim"),
  },
  "/convert": {
    title: "Convert Video Format - Qcut",
    description:
      "Convert videos between MP4, WebM, AVI, MKV and more formats. Free browser-based video converter — no upload needed.",
    load: () => import("./pages/convert"),
  },
  "/compress": {
    title: "Compress Video - Qcut",
    description:
      "Reduce video file size while maintaining quality. Adjust CRF and encoding preset. Free in-browser video compressor.",
    load: () => import("./pages/compress"),
  },
  "/resize": {
    title: "Resize Video - Qcut",
    description:
      "Change video dimensions with preset or custom resolutions. Free browser-based video resizer — no upload needed.",
    load: () => import("./pages/resize"),
  },
  "/extract-audio": {
    title: "Extract Audio from Video - Qcut",
    description:
      "Extract audio tracks from video as MP3 or WAV. Free browser-based audio extractor — no upload needed.",
    load: () => import("./pages/extract-audio"),
  },
  "/merge": {
    title: "Merge Audio & Video - Qcut",
    description:
      "Combine separate audio and video files into one. Free browser-based audio-video merger.",
    load: () => import("./pages/merge"),
  },
  "/gif": {
    title: "Create GIF from Video - Qcut",
    description:
      "Convert video clips to animated GIFs. Set start time, duration, and frame rate. Free in-browser GIF maker.",
    load: () => import("./pages/gif"),
  },
  "/frame-extract": {
    title: "Extract Frames from Video - Qcut",
    description:
      "Extract screenshots and frames from video as images. Free browser-based frame extractor.",
    load: () => import("./pages/frame-extract"),
  },
  "/combine": {
    title: "Combine Video Clips - Qcut",
    description:
      "Concatenate multiple video clips into one file. Free browser-based video joiner — no upload needed.",
    load: () => import("./pages/combine"),
  },
  "/normalize-audio": {
    title: "Normalize Audio - Qcut",
    description:
      "Adjust audio levels for consistent loudness. Set target LUFS, true peak, and loudness range. Free in-browser audio normalizer.",
    load: () => import("./pages/normalize-audio"),
  },
  "/rotate": {
    title: "Rotate & Flip Video - Qcut",
    description:
      "Rotate or flip your video with lossless metadata rotation for MP4/MOV. Free browser-based video rotator.",
    load: () => import("./pages/rotate"),
  },
  "/overlay": {
    title: "Add Overlay to Video - Qcut",
    description:
      "Add image watermarks or overlays to your video. Position, scale, and set opacity. Free in-browser video overlay tool.",
    load: () => import("./pages/overlay"),
  },
  "/privacy": {
    title: "Privacy Policy - Qcut",
    description: "Privacy Policy for Qcut video editor",
    load: () => import("./pages/privacy"),
  },
  "/terms": {
    title: "Terms of Service - Qcut",
    description: "Terms of Service for Qcut video editor",
    load: () => import("./pages/terms"),
  },
  "/cookies": {
    title: "Cookie Policy - Qcut",
    description: "Cookie Policy for Qcut video editor",
    load: () => import("./pages/cookies"),
  },
  "/contact": {
    title: "Contact Us - Qcut",
    description:
      "Get in touch with the Qcut team. We're here to help with questions, feedback, or support.",
    load: () => import("./pages/contact"),
  },
}

let currentCleanup: (() => void) | null = null
let currentPath = ""

/** Strips trailing slash from path (except root "/"). */
function normalizePath(path: string): string {
  return path !== "/" && path.endsWith("/") ? path.slice(0, -1) : path
}

/**
 * Renders the route matching the given path into #page-content.
 * Calls the previous page's destroy() before mounting the new one.
 */
async function renderRoute(path: string): Promise<void> {
  path = normalizePath(path)

  const route = routes[path]
  if (!route) {
    log.warn("No route for path: %s, redirecting to /", path)
    navigate("/", true)
    return
  }

  // Set currentPath immediately to prevent duplicate navigations during async load
  const previousPath = currentPath
  currentPath = path

  // Update document head
  document.title = route.title
  const metaDesc = document.querySelector('meta[name="description"]')
  if (metaDesc) metaDesc.setAttribute("content", route.description)

  // Update canonical link
  const canonical = document.querySelector('link[rel="canonical"]')
  if (canonical) canonical.setAttribute("href", `https://qcut.app${path}`)

  // Tear down previous page
  if (currentCleanup) {
    currentCleanup()
    currentCleanup = null
  }

  const container = document.getElementById("page-content")
  if (!container) return

  // Show a brief loading state
  container.innerHTML = ""

  try {
    const mod = await route.load()

    // Guard: if another navigation happened during async load, abort this render
    if (currentPath !== path) {
      log.debug("Navigation superseded: %s → %s, aborting render of %s", previousPath, currentPath, path)
      return
    }

    const page = mod.default()
    container.appendChild(page.element)
    currentCleanup = page.destroy
  } catch (err) {
    log.error("Failed to load route %s:", path, err)
    container.innerHTML = `<div class="flex items-center justify-center min-h-[60vh]"><p class="text-muted-foreground">Failed to load page.</p></div>`
    // Reset currentPath so navigation can be retried
    currentPath = previousPath
  }

  // Track page view
  trackPageView(path, route.title)
}

/**
 * Navigates to a new path. Shows a confirmation dialog if processing is active.
 * @param path - The target path
 * @param isReplace - Use replaceState instead of pushState
 */
export async function navigate(path: string, isReplace = false): Promise<void> {
  path = normalizePath(path)
  if (path === currentPath) return

  // Navigation guard: confirm before navigating away during processing
  if (getState().isProcessing) {
    const shouldLeave = window.confirm(
      "Video processing is currently in progress. If you navigate away, the processing will be cancelled and you will lose any progress.\n\nCancel processing and navigate?"
    )
    if (!shouldLeave) return
    await cancelProcessing()
  }

  if (isReplace) {
    history.replaceState(null, "", path)
  } else {
    history.pushState(null, "", path)
  }

  await renderRoute(path)
}

/** Initialises the router: wires up click delegation, popstate, and renders the initial route. */
export function initRouter(): void {
  // Handle link clicks via event delegation
  document.addEventListener("click", (e) => {
    const link = (e.target as HTMLElement).closest("a[data-link]") as HTMLAnchorElement | null
    if (!link) return

    e.preventDefault()
    const href = link.getAttribute("href")
    if (href) navigate(href)
  })

  // Handle browser back/forward
  window.addEventListener("popstate", () => {
    const path = normalizePath(window.location.pathname)
    if (path !== currentPath) {
      renderRoute(path)
    }
  })

  // Render the initial route
  renderRoute(window.location.pathname)
}

/** Returns the current path. */
export function getCurrentPath(): string {
  return currentPath
}
