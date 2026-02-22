import type { RouteConfig, Component } from "./types"
import { getState, cancelProcessing } from "./store"
import { trackPageView } from "./lib/analytics"
import { createLogger } from "./lib/logger"

const log = createLogger("router")

/**
 * Maps ActionType values to their canonical SEO-friendly URL paths.
 * Used by navigation code to avoid hardcoding URL paths next to action type identifiers.
 */
export const actionTypePath: Record<string, string> = {
  trim: "/trim-video-online-free",
  convert: "/convert-video-no-watermark",
  compress: "/compress-video-online-free",
  resize: "/resize-video-without-cropping",
  "extract-audio": "/extract-audio-from-video-online",
  merge: "/merge-videos-audios-online-free",
  combine: "/combine-clips-for-free",
  "frame-extract": "/extract-frame-from-video-online",
  gif: "/create-gif-from-any-clip",
  "normalize-audio": "/audio-leveler-online",
  rotate: "/flip-and-rotate-video-orientation",
  overlay: "/veed-watermark-alternative",
}

/**
 * Client-side redirects from old short paths to new SEO-friendly paths.
 * Mirrors the server-side CloudFront Function redirects for in-app navigation.
 */
const redirects: Record<string, string> = {
  "/trim": "/trim-video-online-free",
  "/convert": "/convert-video-no-watermark",
  "/compress": "/compress-video-online-free",
  "/resize": "/resize-video-without-cropping",
  "/extract-audio": "/extract-audio-from-video-online",
  "/merge": "/merge-videos-audios-online-free",
  "/combine": "/combine-clips-for-free",
  "/frame-extract": "/extract-frame-from-video-online",
  "/gif": "/create-gif-from-any-clip",
  "/normalize-audio": "/audio-leveler-online",
  "/rotate": "/flip-and-rotate-video-orientation",
  "/overlay": "/veed-watermark-alternative",
}

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
  "/trim-video-online-free": {
    title: "Trim Video Online Free (No Upload, No Watermark)",
    description:
      "Trim video online for free with no upload and no watermark. Cut clips instantly in your browser with precise, lossless editing.",
    load: () => import("./pages/trim"),
  },
  "/convert-video-no-watermark": {
    title: "Convert Video Online Free (No Upload, No Watermark)",
    description:
      "Convert video formats like MP4, MOV, WebM, and more directly in your browser. No upload required, no watermark, and no account needed.",
    load: () => import("./pages/convert"),
  },
  "/compress-video-online-free": {
    title: "Compress Video Online Free (No Upload Required)",
    description:
      "Compress large videos online without uploading files. Reduce file size while preserving quality — free and watermark-free.",
    load: () => import("./pages/compress"),
  },
  "/resize-video-without-cropping": {
    title: "Resize Video Online Free (Change Aspect Ratio Instantly)",
    description:
      "Resize video dimensions and change aspect ratio for Instagram, TikTok, or YouTube. No upload, no watermark, fully browser-based.",
    load: () => import("./pages/resize"),
  },
  "/extract-audio-from-video-online": {
    title: "Extract Audio From Video Online (MP4 to MP3 Free)",
    description:
      "Extract audio from video instantly and convert to MP3 or WAV. No upload, no account, and no watermark required.",
    load: () => import("./pages/extract-audio"),
  },
  "/merge-videos-audios-online-free": {
    title: "Merge Video and Audio Online Free (No Upload)",
    description:
      "Combine video clips and audio tracks in your browser. No upload, no watermark, and no signup required.",
    load: () => import("./pages/merge"),
  },
  "/combine-clips-for-free": {
    title: "Combine Video Clips Online Free (No Watermark)",
    description:
      "Stitch multiple video clips together instantly in your browser. Free, private, and watermark-free editing.",
    load: () => import("./pages/combine"),
  },
  "/extract-frame-from-video-online": {
    title: "Extract Frame From Video Online (High Quality JPG/PNG)",
    description:
      "Capture high-quality still images from any video file online. Export JPG or PNG instantly with no upload required.",
    load: () => import("./pages/frame-extract"),
  },
  "/create-gif-from-any-clip": {
    title: "Create GIF From Video Online Free (No Watermark)",
    description:
      "Turn video clips into smooth, shareable GIFs instantly. No signup, no watermark, and fully browser-based.",
    load: () => import("./pages/gif"),
  },
  "/audio-leveler-online": {
    title: "Normalize Audio Online (Fix Video Sound Levels Free)",
    description:
      "Balance and normalize uneven audio levels in video instantly. Improve clarity with free, browser-based processing.",
    load: () => import("./pages/normalize-audio"),
  },
  "/flip-and-rotate-video-orientation": {
    title: "Rotate or Flip Video Online Free (Fix Orientation)",
    description:
      "Fix sideways or upside-down videos instantly. Rotate or flip without quality loss, upload, or watermark.",
    load: () => import("./pages/rotate"),
  },
  "/veed-watermark-alternative": {
    title: "Veed Watermark Alternative – Edit Videos Without Branding",
    description:
      "Looking for a Veed alternative without watermarks? Trim, compress, and convert videos privately in your browser with no account required.",
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

  // Check for client-side redirects before route lookup
  const redirectTarget = redirects[path]
  if (redirectTarget) {
    log.debug("Redirecting %s → %s", path, redirectTarget)
    navigate(redirectTarget, true)
    return
  }

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
