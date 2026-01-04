"use client"

import {
  Scissors,
  FileOutput,
  Minimize2,
  Music,
  Merge,
  Image,
  Maximize2,
  Film,
  Layers,
  Volume2,
  RotateCw,
  ImagePlus,
  VolumeX,
  Droplet,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { ActionType } from "@/lib/video-context"

/** Feature definition mapping to action types */
interface Feature {
  icon: React.ComponentType<{ className?: string }>
  title: string
  shortDesc: string
  fullDesc: string
  actionType: ActionType
}

const features: Feature[] = [
  {
    icon: Scissors,
    title: "Trim & Cut",
    shortDesc: "Remove unwanted parts in seconds",
    fullDesc: "Cut to the exact frame you want, then export instantly — no re-encoding delays.",
    actionType: "trim",
  },
  {
    icon: FileOutput,
    title: "Convert Formats",
    shortDesc: "MP4, WebM, MP3, WAV",
    fullDesc:
      "Switch between MP4, WebM, MP3, and WAV with one click. Works with all major browsers and devices.",
    actionType: "convert",
  },
  {
    icon: Music,
    title: "Extract Audio",
    shortDesc: "Pull audio from any video",
    fullDesc:
      "Perfect for podcasts, music, voiceovers, or just saving that soundtrack you love.",
    actionType: "extract-audio",
  },
  {
    icon: Minimize2,
    title: "Compress Video",
    shortDesc: "Shrink file sizes intelligently",
    fullDesc:
      "Reduce bitrate, resolution, or frame rate for email, social media, or messaging apps — you choose.",
    actionType: "compress",
  },
  {
    icon: Maximize2,
    title: "Resize & Crop",
    shortDesc: "Fit any dimension",
    fullDesc:
      "Square for Instagram, vertical for TikTok, widescreen for YouTube — done.",
    actionType: "resize",
  },
  {
    icon: Merge,
    title: "Merge Audio + Video",
    shortDesc: "Combine separate tracks",
    fullDesc:
      "Recorded audio separately? Combine it with your video track seamlessly. Great for voiceovers and dubbed content.",
    actionType: "merge",
  },
  {
    icon: Layers,
    title: "Join Clips Together",
    shortDesc: "Combine multiple videos",
    fullDesc:
      "Perfect for stitching scenes, creating compilations, or assembling presentations.",
    actionType: "combine",
  },
  {
    icon: Image,
    title: "Capture Screenshots",
    shortDesc: "Extract any frame as image",
    fullDesc:
      "Create thumbnails, stills, or reference shots instantly as high-quality images.",
    actionType: "frame-extract",
  },
  {
    icon: Film,
    title: "Create GIFs",
    shortDesc: "Animated clips made easy",
    fullDesc: "Turn any clip into a smooth, shareable GIF. Optimized colors, small file sizes.",
    actionType: "gif",
  },
  {
    icon: Volume2,
    title: "Normalize Audio",
    shortDesc: "Fix volume levels",
    fullDesc:
      "Fix audio that's too quiet or too loud. Balance volume levels for consistent, professional sound.",
    actionType: "normalize-audio",
  },
  {
    icon: RotateCw,
    title: "Rotate & Flip",
    shortDesc: "Fix video orientation",
    fullDesc:
      "Shot your video sideways? Rotate 90°, 180°, or flip horizontally/vertically with one click.",
    actionType: "rotate",
  },
  {
    icon: ImagePlus,
    title: "Add Watermarks",
    shortDesc: "Protect your content",
    fullDesc:
      "Add branding or protection. Drop in any PNG logo and position it anywhere on your video.",
    actionType: "overlay",
  },
]

interface QcutFeaturesProps {
  /** Callback when a feature card is clicked, receives the action type */
  onFeatureClick?: (actionType: ActionType) => void
}

/**
 * Features grid section for the landing page.
 * Displays all available video editing features as clickable cards with tooltips.
 * When clicked, triggers onFeatureClick with the corresponding action type.
 */
export const QcutFeatures = ({ onFeatureClick }: QcutFeaturesProps) => {
  return (
    <section className="py-24 px-6 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="heading-1">Everything You Need. Nothing You Don&apos;t.</h2>
          <p className="body-large mt-4 max-w-xl mx-auto">
            Professional video tools that just work. No learning curve required.
          </p>
        </div>

        <TooltipProvider delayDuration={100}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {features.map((feature, index) => (
              <Tooltip key={feature.title}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onFeatureClick?.(feature.actionType)}
                    className="group p-5 rounded-xl bg-card border hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer text-left"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                        <feature.icon className="h-5 w-5 text-primary group-hover:text-primary-foreground transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-foreground">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                          {feature.shortDesc}
                        </p>
                      </div>
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs p-4">
                  <p className="font-medium mb-1">{feature.title}</p>
                  <p className="text-sm text-muted-foreground">{feature.fullDesc}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      </div>
    </section>
  )
}
