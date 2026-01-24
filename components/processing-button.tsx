"use client"

import { useEffect } from "react"
import { Download, RotateCcw, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { type ActionConfig } from "@/lib/video-context"
import { useVideoProcessor } from "@/lib/use-video-processor"

interface ProcessingButtonProps {
  config: ActionConfig
  onReset?: () => void
}

/**
 * Button component that handles video processing and download.
 * Shows loading state during processing and download/reset options when complete.
 * Warns user before navigating away during processing to prevent data loss.
 */
export function ProcessingButton({ config, onReset }: ProcessingButtonProps) {
  const {
    isLoaded,
    isProcessing,
    isComplete,
    progress,
    error,
    process,
    download,
    resetProcessor,
    resetAll,
  } = useVideoProcessor()
  const requiresFfmpeg = !(config.type === "frame-extract" && config.params.mode === "single")

  // Warn user before navigating away during processing to prevent losing work
  useEffect(() => {
    if (!isProcessing) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // Modern browsers ignore custom messages, but we still need to set returnValue
      return "Video processing is in progress. Are you sure you want to leave?"
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [isProcessing])

  const handleProcess = () => {
    process(config)
  }

  const handleReset = () => {
    resetProcessor()
    if (onReset) {
      onReset()
    } else {
      resetAll()
    }
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
          {error}
        </div>
        <Button variant="outline" onClick={resetProcessor} className="w-full">
          Try Again
        </Button>
      </div>
    )
  }

  if (isProcessing) {
    return (
      <div className="space-y-3">
        <Button disabled className="w-full bg-accent text-accent-foreground">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Processing... {progress}%
        </Button>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    )
  }

  if (isComplete) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-accent text-sm">
          <CheckCircle2 className="w-4 h-4" />
          <span>Complete! File downloaded.</span>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => download(config)}
            variant="outline"
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Again
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            className="flex-1"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Start Over
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Button
      onClick={handleProcess}
      disabled={requiresFfmpeg && !isLoaded}
      className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
    >
      {isLoaded || !requiresFfmpeg ? (
        <>
          <Download className="w-4 h-4 mr-2" />
          Process & Download
        </>
      ) : (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Loading Qcut...
        </>
      )}
    </Button>
  )
}
