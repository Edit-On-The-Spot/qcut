"use client"

import { useState } from "react"
import { ImportScreen } from "@/components/import-screen"
import { ActionsScreen } from "@/components/actions-screen"
import { ExportScreen } from "@/components/export-screen"
import { TrimScreen } from "@/components/operations/trim-screen"
import { ConvertScreen } from "@/components/operations/convert-screen"
import { CompressScreen } from "@/components/operations/compress-screen"
import { ExtractAudioScreen } from "@/components/operations/extract-audio-screen"
import { MergeScreen } from "@/components/operations/merge-screen"
import { GifScreen } from "@/components/operations/gif-screen"
import { ResizeScreen } from "@/components/operations/resize-screen"
import { FrameExtractScreen } from "@/components/operations/frame-extract-screen"
import { CombineScreen } from "@/components/operations/combine-screen"

type Screen = "import" | "actions" | "export" | "operation"

export type ActionType =
  | "convert"
  | "compress"
  | "trim"
  | "extract-audio"
  | "merge"
  | "gif"
  | "resize"
  | "frame-extract"
  | "combine"

export interface VideoData {
  file: File
  duration?: number
  width?: number
  height?: number
  codec?: string
  format?: string
}

export interface ActionConfig {
  type: ActionType
  params: Record<string, any>
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("import")
  const [videoData, setVideoData] = useState<VideoData | null>(null)
  const [actionConfig, setActionConfig] = useState<ActionConfig | null>(null)
  const [currentOperation, setCurrentOperation] = useState<ActionType | null>(null)

  const handleVideoImport = (data: VideoData) => {
    setVideoData(data)
    setScreen("actions")
  }

  const handleActionSelect = (type: ActionType) => {
    setCurrentOperation(type)
    setScreen("operation")
  }

  const handleOperationComplete = (config: ActionConfig) => {
    setActionConfig(config)
    setScreen("export")
  }

  const handleReset = () => {
    setScreen("import")
    setVideoData(null)
    setActionConfig(null)
    setCurrentOperation(null)
  }

  const renderOperationScreen = () => {
    if (!videoData || !currentOperation) return null

    const props = {
      videoData,
      onComplete: handleOperationComplete,
      onBack: () => setScreen("actions"),
    }

    switch (currentOperation) {
      case "trim":
        return <TrimScreen {...props} />
      case "convert":
        return <ConvertScreen {...props} />
      case "compress":
        return <CompressScreen {...props} />
      case "extract-audio":
        return <ExtractAudioScreen {...props} />
      case "merge":
        return <MergeScreen {...props} />
      case "gif":
        return <GifScreen {...props} />
      case "resize":
        return <ResizeScreen {...props} />
      case "frame-extract":
        return <FrameExtractScreen {...props} />
      case "combine":
        return <CombineScreen {...props} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 bg-accent rounded">
                <span className="text-accent-foreground font-bold text-sm">Q</span>
              </div>
              <h1 className="text-xl font-semibold">qcut.ai</h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className={`px-3 py-1 rounded ${screen === "import" ? "bg-accent text-accent-foreground" : ""}`}>
                1. Import
              </div>
              <div className="w-6 h-px bg-border" />
              <div
                className={`px-3 py-1 rounded ${screen === "actions" || screen === "operation" ? "bg-accent text-accent-foreground" : ""}`}
              >
                2. Actions
              </div>
              <div className="w-6 h-px bg-border" />
              <div className={`px-3 py-1 rounded ${screen === "export" ? "bg-accent text-accent-foreground" : ""}`}>
                3. Export
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        {screen === "import" && <ImportScreen onImport={handleVideoImport} />}
        {screen === "actions" && videoData && (
          <ActionsScreen videoData={videoData} onActionSelect={handleActionSelect} onBack={() => setScreen("import")} />
        )}
        {screen === "operation" && renderOperationScreen()}
        {screen === "export" && videoData && actionConfig && (
          <ExportScreen videoData={videoData} actionConfig={actionConfig} onReset={handleReset} />
        )}
      </main>
    </div>
  )
}
