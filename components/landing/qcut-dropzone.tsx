"use client"

import { Upload, Film } from "lucide-react"

interface QcutDropzoneProps {
  onFileSelect: (file: File) => void
  isDragging?: boolean
  onDragStateChange?: (isDragging: boolean) => void
}

/**
 * Drag-and-drop file upload zone for video files.
 * Provides visual feedback during drag operations.
 */
export const QcutDropzone = ({ onFileSelect, isDragging, onDragStateChange }: QcutDropzoneProps) => {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    onDragStateChange?.(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    onDragStateChange?.(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    onDragStateChange?.(false)
    const files = e.dataTransfer.files
    if (files.length > 0 && files[0].type.startsWith("video/")) {
      onFileSelect(files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onFileSelect(files[0])
    }
  }

  return (
    <div className="px-6 pb-16 opacity-0 animate-fade-in-up animation-delay-400">
      <div className="max-w-4xl mx-auto">
        <label
          htmlFor="video-upload"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative flex flex-col items-center justify-center
            min-h-[360px] rounded-2xl border-2 border-dashed
            cursor-pointer transition-all duration-300
            ${
              isDragging
                ? "border-primary bg-primary/5 scale-[1.01]"
                : "border-border hover:border-muted-foreground/50 hover:bg-muted/50"
            }
          `}
        >
          <input id="video-upload" type="file" accept="video/*" onChange={handleFileInput} className="sr-only" />

          <div
            className={`
            flex items-center justify-center w-16 h-16 rounded-2xl mb-6
            ${isDragging ? "bg-primary/10" : "bg-muted"}
            transition-colors duration-300
          `}
          >
            {isDragging ? <Film className="h-8 w-8 text-primary" /> : <Upload className="h-8 w-8 text-muted-foreground" />}
          </div>

          <p className="text-lg font-medium text-foreground">
            {isDragging ? "Drop your video here" : "Drag and drop a video"}
          </p>
          <p className="text-muted-foreground mt-1">or click to browse files</p>

          <p className="text-xs text-muted-foreground mt-6">Supports MP4, WebM, MOV, AVI, MKV and more</p>
        </label>
      </div>
    </div>
  )
}
