"use client"

import { useRef, useEffect, useState } from "react"
import { Upload, X } from "lucide-react"
import { FileSizeWarning, getFileSizeWarningType } from "@/components/file-size-warning"

interface FileSelectModalProps {
  /** Whether the modal is currently visible */
  isOpen: boolean
  /** Callback when the modal is closed without selecting a file */
  onClose: () => void
  /** Callback when a video file is selected */
  onFileSelect: (file: File) => void
  /** Title text to display in the modal */
  title: string
}

/**
 * Modal dialog for selecting a video file.
 * Used when user clicks an action without having a video loaded.
 * Provides both drag-and-drop and click-to-browse options.
 */
export function FileSelectModal({ isOpen, onClose, onFileSelect, title }: FileSelectModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const [fileSizeWarning, setFileSizeWarning] = useState<{
    type: "error" | "warning"
    file: File
  } | null>(null)

  /**
   * Validates file size and either shows a warning or proceeds with selection.
   * @param file - The selected video file
   */
  const validateAndSelectFile = (file: File) => {
    const warningType = getFileSizeWarningType(file.size)
    if (warningType) {
      setFileSizeWarning({ type: warningType, file })
    } else {
      onFileSelect(file)
    }
  }

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      validateAndSelectFile(files[0])
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files.length > 0 && files[0].type.startsWith("video/")) {
      validateAndSelectFile(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-md mx-4 bg-card border rounded-2xl shadow-xl animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        <div className="p-6">
          <h2 className="text-xl font-semibold text-center mb-2">{title}</h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Select a video file to get started
          </p>

          {/* Drop zone */}
          <label
            htmlFor="modal-file-input"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
          >
            <input
              ref={fileInputRef}
              id="modal-file-input"
              type="file"
              accept="video/*"
              onChange={handleFileInput}
              className="sr-only"
            />
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
              <Upload className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">Drop a video here</p>
            <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
          </label>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Supports MP4, WebM, MOV, AVI, MKV and more
          </p>
        </div>
      </div>

      {/* File size warning dialog */}
      {fileSizeWarning && (
        <FileSizeWarning
          type={fileSizeWarning.type}
          isOpen={true}
          fileSizeBytes={fileSizeWarning.file.size}
          onClose={() => setFileSizeWarning(null)}
          onProceed={() => {
            const file = fileSizeWarning.file
            setFileSizeWarning(null)
            onFileSelect(file)
          }}
        />
      )}
    </div>
  )
}
