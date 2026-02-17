import { getState, subscribe } from "../store"

const WAIT_TIMEOUT_MS = 500

/**
 * Waits for video data to appear in the store.
 * Returns { videoData } if available, or resolves with null after timeout.
 * Replaces the React useRequireVideo hook.
 */
export function waitForVideo(): Promise<{ isReady: boolean; needsUpload: boolean }> {
  const state = getState()
  if (state.videoData) {
    return Promise.resolve({ isReady: true, needsUpload: false })
  }

  return new Promise((resolve) => {
    const unsub = subscribe(() => {
      if (getState().videoData) {
        unsub()
        clearTimeout(timer)
        resolve({ isReady: true, needsUpload: false })
      }
    })

    const timer = setTimeout(() => {
      unsub()
      if (getState().videoData) {
        resolve({ isReady: true, needsUpload: false })
      } else {
        resolve({ isReady: false, needsUpload: true })
      }
    }, WAIT_TIMEOUT_MS)
  })
}
