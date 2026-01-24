"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ExternalLink, AlertTriangle, XCircle } from "lucide-react"

interface FileSizeWarningProps {
  /** Type of warning: 'error' for >4GB, 'warning' for 2-4GB */
  type: "error" | "warning"
  /** Whether the dialog is open */
  isOpen: boolean
  /** Callback when the dialog is closed */
  onClose: () => void
  /** Callback when user confirms to proceed (only for warning type) */
  onProceed?: () => void
  /** File size in bytes */
  fileSizeBytes: number
}

const FOUR_GB_BYTES = 4 * 1024 * 1024 * 1024
const TWO_GB_BYTES = 2 * 1024 * 1024 * 1024

/**
 * Formats bytes to human-readable size.
 * @param bytes - Size in bytes
 * @returns Formatted string like "2.5 GB"
 */
function formatFileSize(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024)
  if (gb >= 1) {
    return `${gb.toFixed(2)} GB`
  }
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(2)} MB`
}

/**
 * Dialog shown when users select files that exceed browser limitations.
 * Shows an error for files >4GB (browser cannot process).
 * Shows a warning for files 2-4GB (output files may exceed 2GB limit).
 */
export function FileSizeWarning({
  type,
  isOpen,
  onClose,
  onProceed,
  fileSizeBytes,
}: FileSizeWarningProps) {
  const isError = type === "error"
  const formattedSize = formatFileSize(fileSizeBytes)

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isError ? (
              <>
                <XCircle className="h-5 w-5 text-destructive" />
                File Too Large
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Large File Warning
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {isError ? (
                <>
                  <p>
                    Your file ({formattedSize}) exceeds the 4GB limit that browsers can process.
                  </p>
                  <p className="text-foreground font-medium">
                    Your browser doesn&apos;t support processing files larger than 4GB.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Your file ({formattedSize}) is between 2GB and 4GB.
                  </p>
                  <p className="text-foreground font-medium">
                    Your browser can process this file, but won&apos;t be able to save output files larger than 2GB.
                  </p>
                  <p>
                    Some operations like trimming may work, but operations that increase file size could fail.
                  </p>
                </>
              )}
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="font-medium text-foreground">Need to process larger files?</p>
                <p className="text-sm mt-1">
                  Check out <strong>Edit on the Spot</strong> - our professional video editing platform
                  with no file size limitations.
                </p>
                <a
                  href="https://editonthespot.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-sm text-primary hover:underline"
                >
                  Visit Edit on the Spot
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {isError ? (
            <AlertDialogAction onClick={onClose}>OK</AlertDialogAction>
          ) : (
            <>
              <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onProceed}>
                Proceed Anyway
              </AlertDialogAction>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * Validates file size and returns the appropriate warning type.
 * @param fileSizeBytes - File size in bytes
 * @returns 'error' for >4GB, 'warning' for 2-4GB, null if no issue
 */
export function getFileSizeWarningType(fileSizeBytes: number): "error" | "warning" | null {
  if (fileSizeBytes > FOUR_GB_BYTES) {
    return "error"
  }
  if (fileSizeBytes > TWO_GB_BYTES) {
    return "warning"
  }
  return null
}
