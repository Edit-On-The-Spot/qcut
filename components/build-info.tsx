"use client"

import { useEffect } from "react"

// Build time is captured at build time via Next.js
const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString()

/**
 * Component that logs build information on app load.
 * Helps identify which version is running.
 */
export function BuildInfo() {
  useEffect(() => {
    console.log(`[Qcut] Build time: ${BUILD_TIME}`)
    console.log(`[Qcut] Environment: ${process.env.NODE_ENV}`)
  }, [])

  return null
}
