"use client"

import { ArrowRight } from "lucide-react"

interface FinalCTASectionProps {
  onStartEditing: () => void
}

/**
 * Final call-to-action section for the landing page.
 * Displays a compelling CTA to encourage users to start editing.
 */
export const FinalCTASection = ({ onStartEditing }: FinalCTASectionProps) => {
  return (
    <section className="py-24 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="heading-display">Ready to Edit?</h2>
        <p className="body-large mt-4 text-muted-foreground">No signup. No download. Just results.</p>
        <p className="text-muted-foreground mt-2">The Fastest Way to Edit Videos in Your Browser</p>

        <div className="mt-10">
          <button
            onClick={onStartEditing}
            className="inline-flex items-center gap-3 px-10 py-5 bg-primary text-primary-foreground rounded-full font-semibold text-lg hover-lift hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 group"
          >
            Start Editing Now
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  )
}
