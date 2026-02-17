const FOUR_GB_BYTES = 4 * 1024 * 1024 * 1024
const TWO_GB_BYTES = 2 * 1024 * 1024 * 1024

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

/**
 * Formats bytes to human-readable size.
 * @param bytes - Size in bytes
 * @returns Formatted string like "2.5 GB"
 */
export function formatFileSize(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024)
  if (gb >= 1) {
    return `${gb.toFixed(2)} GB`
  }
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(2)} MB`
}
