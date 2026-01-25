"use client"

import { Loader2 } from "lucide-react"

interface VideoLoadingProps {
  /** Message to display while loading */
  message?: string
}

/**
 * Loading state component for when video data is not yet available.
 */
export function VideoLoading({ message = "Loading video..." }: VideoLoadingProps) {
  return (
    <div className="max-w-6xl mx-auto flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}
