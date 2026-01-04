"use client"

import { Upload, Lock, Zap, Target, UserX } from "lucide-react"

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
      <div className="max-w-4xl mx-auto text-center">
        {/* Main headline */}
        <h1 className="heading-display text-balance opacity-0 animate-fade-in">
          Cut, Convert & Edit Videos
          <br />
          <span className="text-primary">Right in Your Browser</span>
          <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-lg font-semibold bg-primary text-primary-foreground">
            Free
          </span>
        </h1>

        {/* Subheadline */}
        <p className="body-large mt-6 max-w-2xl mx-auto text-balance opacity-0 animate-fade-in animation-delay-100">
          No software to install. No account needed. No watermarks.
        </p>

        <p className="text-muted-foreground mt-3 max-w-2xl mx-auto text-balance opacity-0 animate-fade-in animation-delay-150">
          Cut, trim, resize, convert formats, extract audio, create GIFs, and export high-quality
          videos — Lightning-fast, lossless video editing.
        </p>

        {/* CTA Button */}
        <div className="mt-10 opacity-0 animate-fade-in animation-delay-200">
          <button
            onClick={onSelectVideo}
            className="inline-flex items-center gap-3 px-10 py-5 bg-primary text-primary-foreground rounded-full font-semibold text-lg hover-lift hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            <Upload className="h-5 w-5" />
            Select Video
          </button>
        </div>

        {/* Trust Badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 opacity-0 animate-fade-in animation-delay-300">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4 text-primary" />
            <span>100% Private — files stay on your device</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="h-4 w-4 text-primary" />
            <span>Lightning fast — no upload wait times</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Target className="h-4 w-4 text-primary" />
            <span>No watermarks</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserX className="h-4 w-4 text-primary" />
            <span>No account required</span>
          </div>
        </div>
      </div>
    </section>
  )
}
