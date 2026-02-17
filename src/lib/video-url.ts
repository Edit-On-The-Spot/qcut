/**
 * Creates an object URL for a File.
 * Returns the URL and a cleanup function to revoke it.
 * Replaces the React useVideoUrl hook.
 */
export function createVideoUrl(file: File | null | undefined): { url: string; revoke: () => void } {
  if (!file) {
    return { url: "", revoke: () => {} }
  }
  const url = URL.createObjectURL(file)
  return { url, revoke: () => URL.revokeObjectURL(url) }
}
