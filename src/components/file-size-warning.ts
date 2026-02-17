import type { Component } from "../types"
import { formatFileSize } from "../lib/file-utils"
import { iconSvg } from "../lib/icons"

/**
 * Dialog shown when users select files that exceed browser limitations.
 * Shows an error for files >4GB (browser cannot process).
 * Shows a warning for files 2-4GB (output files may exceed 2GB limit).
 * Uses native <dialog> element.
 */
export function createFileSizeWarning(
  type: "error" | "warning",
  fileSizeBytes: number,
  onClose: () => void,
  onProceed?: () => void
): Component {
  const isError = type === "error"
  const formattedSize = formatFileSize(fileSizeBytes)

  const dialog = document.createElement("dialog")
  dialog.className = "rounded-lg border bg-background p-6 shadow-lg backdrop:bg-black/50 w-full max-w-md"

  const titleHtml = isError
    ? `${iconSvg("XCircle", 20, "h-5 w-5 text-destructive inline")} File Too Large`
    : `${iconSvg("AlertTriangle", 20, "h-5 w-5 text-yellow-500 inline")} Large File Warning`

  const bodyHtml = isError
    ? `<p>Your file (${formattedSize}) exceeds the 4GB limit that browsers can process.</p>
       <p class="text-foreground font-medium mt-2">Your browser doesn't support processing files larger than 4GB.</p>`
    : `<p>Your file (${formattedSize}) is between 2GB and 4GB.</p>
       <p class="text-foreground font-medium mt-2">Your browser can process this file, but won't be able to save output files larger than 2GB.</p>
       <p class="mt-2">Some operations like trimming may work, but operations that increase file size could fail.</p>`

  const buttonsHtml = isError
    ? `<button id="fsw-ok" class="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">OK</button>`
    : `<button id="fsw-cancel" class="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">Cancel</button>
       <button id="fsw-proceed" class="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">Proceed Anyway</button>`

  dialog.innerHTML = `
    <div class="space-y-4">
      <h2 class="text-lg font-semibold flex items-center gap-2">${titleHtml}</h2>
      <div class="text-sm text-muted-foreground space-y-2">
        ${bodyHtml}
        <div class="mt-4 p-4 bg-muted rounded-lg">
          <p class="font-medium text-foreground">Need to process larger files?</p>
          <p class="text-sm mt-1">Check out <strong>Edit on the Spot</strong> - our professional video editing platform with no file size limitations.</p>
          <a href="https://editonthespot.com" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 mt-2 text-sm text-primary hover:underline">
            Visit Edit on the Spot ${iconSvg("ExternalLink", 12, "h-3 w-3")}
          </a>
        </div>
      </div>
      <div class="flex justify-end gap-2">${buttonsHtml}</div>
    </div>
  `

  const close = () => {
    dialog.close()
    dialog.remove()
    onClose()
  }

  dialog.querySelector("#fsw-ok")?.addEventListener("click", close)
  dialog.querySelector("#fsw-cancel")?.addEventListener("click", close)
  dialog.querySelector("#fsw-proceed")?.addEventListener("click", () => {
    dialog.close()
    dialog.remove()
    onProceed?.()
  })

  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) close()
  })

  return {
    element: dialog,
    destroy: () => dialog.remove(),
  }
}
