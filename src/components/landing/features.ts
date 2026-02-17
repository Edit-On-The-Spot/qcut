import type { Component, ActionType } from "../../types"
import { iconSvg } from "../../lib/icons"

interface Feature {
  iconName: string
  title: string
  shortDesc: string
  fullDesc: string
  actionType: ActionType
}

const features: Feature[] = [
  {
    iconName: "Scissors",
    title: "Trim & Cut",
    shortDesc: "Remove unwanted parts in seconds",
    fullDesc: "Cut to the exact frame you want, then export instantly — no re-encoding delays.",
    actionType: "trim",
  },
  {
    iconName: "FileOutput",
    title: "Convert Formats",
    shortDesc: "MP4, WebM, MP3, WAV",
    fullDesc: "Switch between MP4, WebM, MP3, and WAV with one click. Works with all major browsers and devices.",
    actionType: "convert",
  },
  {
    iconName: "Music",
    title: "Extract Audio",
    shortDesc: "Pull audio from any video",
    fullDesc: "Perfect for podcasts, music, voiceovers, or just saving that soundtrack you love.",
    actionType: "extract-audio",
  },
  {
    iconName: "Minimize2",
    title: "Compress Video",
    shortDesc: "Shrink file sizes intelligently",
    fullDesc: "Reduce bitrate, resolution, or frame rate for email, social media, or messaging apps — you choose.",
    actionType: "compress",
  },
  {
    iconName: "Maximize2",
    title: "Resize & Crop",
    shortDesc: "Fit any dimension",
    fullDesc: "Square for Instagram, vertical for TikTok, widescreen for YouTube — done.",
    actionType: "resize",
  },
  {
    iconName: "Merge",
    title: "Merge Audio + Video",
    shortDesc: "Combine separate tracks",
    fullDesc: "Recorded audio separately? Combine it with your video track seamlessly. Great for voiceovers and dubbed content.",
    actionType: "merge",
  },
  {
    iconName: "Layers",
    title: "Join Clips Together",
    shortDesc: "Combine multiple videos",
    fullDesc: "Perfect for stitching scenes, creating compilations, or assembling presentations.",
    actionType: "combine",
  },
  {
    iconName: "Image",
    title: "Capture Screenshots",
    shortDesc: "Extract any frame as image",
    fullDesc: "Create thumbnails, stills, or reference shots instantly as high-quality images.",
    actionType: "frame-extract",
  },
  {
    iconName: "Film",
    title: "Create GIFs",
    shortDesc: "Animated clips made easy",
    fullDesc: "Turn any clip into a smooth, shareable GIF. Optimized colors, small file sizes.",
    actionType: "gif",
  },
  {
    iconName: "Volume2",
    title: "Normalize Audio",
    shortDesc: "Fix volume levels",
    fullDesc: "Fix audio that's too quiet or too loud. Balance volume levels for consistent, professional sound.",
    actionType: "normalize-audio",
  },
  {
    iconName: "RotateCw",
    title: "Rotate & Flip",
    shortDesc: "Fix video orientation",
    fullDesc: "Shot your video sideways? Rotate 90°, 180°, or flip horizontally/vertically with one click.",
    actionType: "rotate",
  },
  {
    iconName: "ImagePlus",
    title: "Add Watermarks",
    shortDesc: "Protect your content",
    fullDesc: "Add branding or protection. Drop in any PNG logo and position it anywhere on your video.",
    actionType: "overlay",
  },
]

/**
 * Features grid section for the landing page.
 * Displays all available video editing features as clickable cards with title tooltips.
 */
export function createFeatures(onFeatureClick: (actionType: ActionType) => void): Component {
  const section = document.createElement("section")
  section.className = "py-24 px-6 bg-muted/30"

  const cardsHtml = features
    .map(
      (f, i) => `
    <button type="button" data-action="${f.actionType}"
      class="group p-5 rounded-xl bg-card border hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer text-left"
      style="animation-delay:${i * 50}ms"
      title="${f.fullDesc}">
      <div class="flex items-start gap-4">
        <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
          ${iconSvg(f.iconName, 20, "h-5 w-5 text-primary group-hover:text-primary-foreground transition-colors")}
        </div>
        <div class="min-w-0">
          <h3 class="font-medium text-foreground">${f.title}</h3>
          <p class="text-sm text-muted-foreground mt-0.5 line-clamp-1">${f.shortDesc}</p>
        </div>
      </div>
    </button>
  `
    )
    .join("")

  section.innerHTML = `
    <div class="max-w-6xl mx-auto">
      <div class="text-center mb-16">
        <h2 class="heading-1">Everything You Need. Nothing You Don't.</h2>
        <p class="body-large mt-4 max-w-xl mx-auto">
          Professional video tools that just work. No learning curve required.
        </p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        ${cardsHtml}
      </div>
    </div>
  `

  const handleClick = (e: Event) => {
    const btn = (e.target as HTMLElement).closest("[data-action]") as HTMLElement | null
    if (btn) {
      onFeatureClick(btn.dataset.action as ActionType)
    }
  }

  section.addEventListener("click", handleClick)

  return {
    element: section,
    destroy: () => section.removeEventListener("click", handleClick),
  }
}
