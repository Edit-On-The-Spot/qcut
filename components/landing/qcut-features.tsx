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
} from "lucide-react"
import type { ActionType } from "@/lib/video-context"

/** Feature definition mapping to action types */
interface Feature {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  actionType: ActionType
}

const features: Feature[] = [
  {
    icon: FileOutput,
    title: "Convert Format",
    description: "MP4, WebM, MOV, AVI & more",
    actionType: "convert",
  },
  {
    icon: Minimize2,
    title: "Compress Video",
    description: "Reduce file size intelligently",
    actionType: "compress",
  },
  {
    icon: Scissors,
    title: "Cut / Trim",
    description: "Remove unwanted sections",
    actionType: "trim",
  },
  {
    icon: Music,
    title: "Extract Audio",
    description: "Get MP3, WAV, or AAC",
    actionType: "extract-audio",
  },
  {
    icon: Merge,
    title: "Merge Audio+Video",
    description: "Combine separate tracks",
    actionType: "merge",
  },
  {
    icon: Image,
    title: "Create GIF",
    description: "Animated clips made easy",
    actionType: "gif",
  },
  {
    icon: Maximize2,
    title: "Resize Video",
    description: "Change dimensions & aspect",
    actionType: "resize",
  },
  {
    icon: Film,
    title: "Frame Extract",
    description: "Export as PNG or JPG",
    actionType: "frame-extract",
  },
  {
    icon: Layers,
    title: "Combine Clips",
    description: "Merge multiple videos",
    actionType: "combine",
  },
]

interface QcutFeaturesProps {
  /** Callback when a feature card is clicked, receives the action type */
  onFeatureClick?: (actionType: ActionType) => void
}

/**
 * Features grid section for the landing page.
 * Displays all available video editing features as clickable cards.
 * When clicked, triggers onFeatureClick with the corresponding action type.
 */
export const QcutFeatures = ({ onFeatureClick }: QcutFeaturesProps) => {
  return (
    <section className="py-20 px-6 bg-muted/30">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="heading-1">Everything you need</h2>
          <p className="body-large mt-3">Powered by FFmpeg. Runs entirely in your browser.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <button
              key={feature.title}
              type="button"
              onClick={() => onFeatureClick?.(feature.actionType)}
              className="group p-5 rounded-xl bg-card border hover:border-primary/30 hover:shadow-md transition-all duration-200 text-left cursor-pointer"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{feature.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
