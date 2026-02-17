/**
 * Google Analytics event tracking utility.
 * Provides typed helper functions for tracking custom events via gtag.
 */

declare global {
  interface Window {
    gtag?: (
      command: "event" | "config" | "set",
      action: string,
      params?: Record<string, unknown>
    ) => void
  }
}

/**
 * Track a custom event in Google Analytics.
 * Safely handles cases where gtag is not loaded.
 */
function trackEvent(
  action: string,
  category: string,
  label?: string,
  value?: number
) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", action, {
      event_category: category,
      event_label: label,
      value: value,
    })
  }
}

// Video import events
export function trackVideoImport(fileName: string, fileSizeMB: number) {
  trackEvent("video_import", "engagement", fileName, Math.round(fileSizeMB))
}

export function trackVideoImportError(errorMessage: string) {
  trackEvent("video_import_error", "error", errorMessage)
}

// Action selection events
export function trackActionSelect(actionType: string) {
  trackEvent("action_select", "engagement", actionType)
}

// Processing events
export function trackProcessingStart(actionType: string) {
  trackEvent("processing_start", "engagement", actionType)
}

export function trackProcessingComplete(
  actionType: string,
  durationMs: number
) {
  trackEvent("processing_complete", "conversion", actionType, durationMs)
}

export function trackProcessingError(actionType: string, errorMessage: string) {
  trackEvent("processing_error", "error", `${actionType}: ${errorMessage}`)
}

// Download events (key conversion)
export function trackDownload(actionType: string, fileSizeMB: number) {
  trackEvent("download", "conversion", actionType, Math.round(fileSizeMB))
}

// Page view events (for SPA navigation)
export function trackPageView(pagePath: string, pageTitle?: string) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "page_view", {
      page_path: pagePath,
      page_title: pageTitle,
    })
  }
}

// General error tracking
export function trackError(errorType: string, errorMessage: string) {
  trackEvent("error", "error", `${errorType}: ${errorMessage}`)
}

// Feature click from landing page
export function trackFeatureClick(featureName: string) {
  trackEvent("feature_click", "engagement", featureName)
}
