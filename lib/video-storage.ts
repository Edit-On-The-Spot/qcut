import type { VideoData } from "./video-context"

const DB_NAME = "qcut"
const DB_VERSION = 1
const STORE_NAME = "video"
const VIDEO_KEY = "current"

/**
 * Opens the IndexedDB database, creating the object store on first use.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

interface StoredVideoData {
  file: File
  duration?: number
  width?: number
  height?: number
  codec?: string
  format?: string
}

/**
 * Saves video data to IndexedDB for recovery after full page reloads.
 * Stores the File object and metadata but not fileData (Uint8Array) since
 * it can be re-derived from the File.
 */
export async function saveVideoData(data: VideoData): Promise<void> {
  const db = await openDB()
  const stored: StoredVideoData = {
    file: data.file,
    duration: data.duration,
    width: data.width,
    height: data.height,
    codec: data.codec,
    format: data.format,
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    tx.objectStore(STORE_NAME).put(stored, VIDEO_KEY)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

/**
 * Loads video data from IndexedDB.
 * Returns null if no data is stored or if the stored File is no longer readable.
 */
export async function loadVideoData(): Promise<VideoData | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly")
    const request = tx.objectStore(STORE_NAME).get(VIDEO_KEY)
    request.onsuccess = () => {
      db.close()
      const stored = request.result as StoredVideoData | undefined
      if (!stored?.file) {
        resolve(null)
        return
      }
      // Reconstruct File from stored Blob (IndexedDB stores Files as Blobs)
      const file = new File([stored.file], stored.file.name, {
        type: stored.file.type,
        lastModified: stored.file.lastModified,
      })
      resolve({
        file,
        duration: stored.duration,
        width: stored.width,
        height: stored.height,
        codec: stored.codec,
        format: stored.format,
      })
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

/**
 * Clears video data from IndexedDB.
 */
export async function clearVideoData(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    tx.objectStore(STORE_NAME).clear()
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}
