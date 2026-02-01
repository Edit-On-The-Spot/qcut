/**
 * Structured logging utility using the debug npm module.
 * Enable logging by setting DEBUG environment variable or localStorage.
 *
 * Usage:
 *   import { createLogger } from '@/lib/logger'
 *   const log = createLogger('component-name')
 *   log.info('message')
 *   log.error('error message', error)
 *
 * Enable in browser console:
 *   localStorage.setItem('debug', 'qcut:*')
 *
 * Enable specific namespaces:
 *   localStorage.setItem('debug', 'qcut:ffmpeg,qcut:processor')
 */
import debug from "debug"

// Enable debug in browser if localStorage has debug setting
if (typeof window !== "undefined") {
  const debugSetting = localStorage.getItem("debug")
  if (debugSetting) {
    debug.enable(debugSetting)
  }
}

export interface Logger {
  debug: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

/**
 * Creates a namespaced logger instance.
 * @param namespace - The namespace for this logger (e.g., 'ffmpeg', 'processor')
 * @returns Logger object with debug, info, warn, error methods
 */
export function createLogger(namespace: string): Logger {
  const baseNamespace = `qcut:${namespace}`

  const debugLog = debug(`${baseNamespace}:debug`)
  const infoLog = debug(`${baseNamespace}:info`)
  const warnLog = debug(`${baseNamespace}:warn`)
  const errorLog = debug(`${baseNamespace}:error`)

  return {
    debug: (formatter: unknown, ...args: unknown[]) => debugLog(formatter as string, ...args),
    info: (formatter: unknown, ...args: unknown[]) => infoLog(formatter as string, ...args),
    warn: (formatter: unknown, ...args: unknown[]) => warnLog(formatter as string, ...args),
    error: (formatter: unknown, ...args: unknown[]) => errorLog(formatter as string, ...args),
  }
}

/**
 * Enables debug logging for specified namespaces.
 * Call this in development or when debugging issues.
 * @param namespaces - Comma-separated namespaces or '*' for all
 */
export function enableLogging(namespaces: string = "qcut:*"): void {
  debug.enable(namespaces)
  if (typeof window !== "undefined") {
    localStorage.setItem("debug", namespaces)
  }
}

/**
 * Disables all debug logging.
 */
export function disableLogging(): void {
  debug.disable()
  if (typeof window !== "undefined") {
    localStorage.removeItem("debug")
  }
}
