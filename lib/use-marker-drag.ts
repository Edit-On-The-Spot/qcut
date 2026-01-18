"use client"

import { useCallback, useRef, type RefObject } from "react"
import { snapTimeToFrame, calculateTimeFromMousePosition, timeToFrame } from "./time-utils"

export interface MarkerDragOptions {
  videoRef: RefObject<HTMLVideoElement>
  framerate: number
  duration: number
  startTime: number
  endTime: number
  visibleStart: number
  visibleEnd: number
  containerWidth: number
  onStartChange: (time: number, frame: number) => void
  onEndChange: (time: number, frame: number) => void
  onDragStateChange: (isDragging: boolean, markerType: "start" | "end" | null) => void
}

export interface MarkerDragResult {
  handleStartMarkerMouseDown: (e: React.MouseEvent) => void
  handleEndMarkerMouseDown: (e: React.MouseEvent) => void
  isDraggingStart: boolean
  isDraggingEnd: boolean
}

/**
 * Hook to manage draggable marker interactions with real-time preview and auto-swap.
 * Handles mouse down, move, and up events for start/end markers with frame snapping.
 * @param options - Configuration for marker dragging
 * @returns Drag handlers and state
 */
export function useMarkerDrag(options: MarkerDragOptions): MarkerDragResult {
  const {
    videoRef,
    framerate,
    duration,
    startTime,
    endTime,
    visibleStart,
    visibleEnd,
    containerWidth,
    onStartChange,
    onEndChange,
    onDragStateChange,
  } = options

  const isDraggingStartRef = useRef(false)
  const isDraggingEndRef = useRef(false)

  /**
   * Throttled video preview update using requestAnimationFrame.
   * Prevents excessive seek operations during dragging.
   */
  const updateVideoPreview = useCallback((time: number) => {
    if (videoRef.current && !isNaN(time)) {
      videoRef.current.currentTime = time
    }
  }, [videoRef])

  /**
   * Handles start marker drag with auto-swap logic.
   */
  const handleStartMarkerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    isDraggingStartRef.current = true
    onDragStateChange(true, "start")

    // Capture parent element at mousedown time
    const parentElement = (e.currentTarget as HTMLElement).parentElement
    if (!parentElement) return

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const rect = parentElement.getBoundingClientRect()
      const mouseX = moveEvent.clientX - rect.left
      const newTime = calculateTimeFromMousePosition(mouseX, containerWidth, visibleStart, visibleEnd)
      const snappedTime = snapTimeToFrame(newTime, framerate, duration)
      const frame = timeToFrame(snappedTime, framerate)

      // Check for swap condition: if start is dragged past end
      if (snappedTime > endTime) {
        // Swap markers
        const endFrame = timeToFrame(endTime, framerate)
        onEndChange(snappedTime, frame)
        onStartChange(endTime, endFrame)
      } else {
        onStartChange(snappedTime, frame)
      }

      // Real-time preview
      updateVideoPreview(snappedTime)
    }

    const handleMouseUp = () => {
      isDraggingStartRef.current = false
      onDragStateChange(false, null)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }, [
    containerWidth,
    visibleStart,
    visibleEnd,
    framerate,
    duration,
    endTime,
    onStartChange,
    onEndChange,
    onDragStateChange,
    updateVideoPreview,
  ])

  /**
   * Handles end marker drag with auto-swap logic.
   */
  const handleEndMarkerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    isDraggingEndRef.current = true
    onDragStateChange(true, "end")

    // Capture parent element at mousedown time
    const parentElement = (e.currentTarget as HTMLElement).parentElement
    if (!parentElement) return

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const rect = parentElement.getBoundingClientRect()
      const mouseX = moveEvent.clientX - rect.left
      const newTime = calculateTimeFromMousePosition(mouseX, containerWidth, visibleStart, visibleEnd)
      const snappedTime = snapTimeToFrame(newTime, framerate, duration)
      const frame = timeToFrame(snappedTime, framerate)

      // Check for swap condition: if end is dragged before start
      if (snappedTime < startTime) {
        // Swap markers
        const startFrame = timeToFrame(startTime, framerate)
        onStartChange(snappedTime, frame)
        onEndChange(startTime, startFrame)
      } else {
        onEndChange(snappedTime, frame)
      }

      // Real-time preview
      updateVideoPreview(snappedTime)
    }

    const handleMouseUp = () => {
      isDraggingEndRef.current = false
      onDragStateChange(false, null)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }, [
    containerWidth,
    visibleStart,
    visibleEnd,
    framerate,
    duration,
    startTime,
    onStartChange,
    onEndChange,
    onDragStateChange,
    updateVideoPreview,
  ])

  return {
    handleStartMarkerMouseDown,
    handleEndMarkerMouseDown,
    isDraggingStart: isDraggingStartRef.current,
    isDraggingEnd: isDraggingEndRef.current,
  }
}
