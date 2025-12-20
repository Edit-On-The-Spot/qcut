"use client"

import { Upload } from "lucide-react"

interface QcutHeroProps {
  onSelectVideo: () => void
}

/**
 * Hero section for the landing page.
 * Displays main headline, value proposition, and CTA button.
 */
export const QcutHero = ({ onSelectVideo }: QcutHeroProps) => {
  return (
    <section className="pt-32 pb-8 px-6">
      <div className="max-w-3xl mx-auto text-center">
        {/* Main headline */}
        <h1 className="heading-display text-balance opacity-0 animate-fade-in">
          The Swiss Army Knife
          <br />
          <span className="text-primary">for Video Editing</span>
        </h1>

        {/* Subheadline */}
        <p className="body-large mt-6 max-w-xl mx-auto text-balance opacity-0 animate-fade-in animation-delay-100">
          No popups. No ads. No account. Just drag, drop, and edit.
          <span className="inline-flex items-center ml-2 px-2.5 py-0.5 rounded-full text-sm font-medium bg-primary text-primary-foreground">
            100% Free
          </span>
        </p>

        {/* Privacy note */}
        <p className="text-sm text-muted-foreground mt-3 opacity-0 animate-fade-in animation-delay-200">
          All processing happens in your browser. Your files never leave your device.
        </p>

        {/* CTA Button */}
        <div className="mt-10 opacity-0 animate-fade-in animation-delay-300">
          <button
            onClick={onSelectVideo}
            className="inline-flex items-center gap-3 px-8 py-4 bg-foreground text-background rounded-full font-medium text-lg hover-lift hover:bg-foreground/90 transition-colors"
          >
            <Upload className="h-5 w-5" />
            Select Video
          </button>
        </div>
      </div>
    </section>
  )
}
