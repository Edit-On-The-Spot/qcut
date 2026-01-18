# /trim Page Specification

## Overview

This specification defines the enhanced trim functionality for qcut's `/trim` page, focusing on connecting the timeline scrubber and thumbnail strip, making both interactive and functional, and enabling draggable start/end markers.

## User Stories & Success Criteria

### User Story 1: Default Selection
**As a** video editor
**I want** the entire video to be selected by default (start at 0, end at video duration)
**So that** I can immediately see what will be processed and quickly adjust if needed

**Success Criteria:**
- On page load, start marker appears at 0:00.00
- On page load, end marker appears at video duration
- Selection overlay is visible covering the entire timeline
- Both markers are immediately draggable without requiring "Mark Start/End" button clicks

### User Story 2: Draggable Markers
**As a** video editor
**I want** to drag start and end markers on both the scrubber and thumbnail strip
**So that** I can precisely set trim points using whichever view is most convenient

**Success Criteria:**
- Markers are draggable on the timeline scrubber (full-video minimap)
- Markers are draggable on the thumbnail strip (zoomed view)
- Dragging snaps to frame boundaries in real-time
- Video preview updates in real-time as I drag
- If I drag start past end (or vice versa), they swap automatically
- Cursor changes to indicate draggable elements on hover

### User Story 3: Connected Scrubber & Scroller
**As a** video editor
**I want** the scrubber to show the full video while the thumbnail strip zooms
**So that** I have both context (minimap) and precision (zoomed thumbnails) simultaneously

**Success Criteria:**
- Timeline scrubber always shows 0 to video duration (full-video minimap)
- Scrubber displays a viewport indicator showing which portion is visible in the thumbnail strip
- Clicking on scrubber pans the thumbnail strip to that position
- Thumbnail strip supports independent zoom levels

### User Story 4: Functional Scroller
**As a** video editor
**I want** to pan the thumbnail strip by dragging and zoom with the mouse wheel
**So that** I can navigate through the video efficiently

**Success Criteria:**
- Horizontal drag on thumbnail background pans the timeline
- Mouse wheel zooms in/out (centered on mouse position)
- Ctrl+Wheel provides alternative zoom control
- Keyboard arrows (left/right) pan the timeline
- During playback, thumbnail strip auto-scrolls to keep playhead visible

## Component Architecture

### Timeline Scrubber (Full-Video Minimap)
**Location:** Top section (lines 285-309 in trim-screen.tsx)
**Purpose:** Provides full-video context and coarse navigation

**Elements:**
- Full-width progress bar (0 to duration)
- Current playback position indicator (large accent dot)
- Start marker (draggable handle, green)
- End marker (draggable handle, red)
- Selection overlay (semi-transparent fill between start/end)
- Viewport indicator (shows visible range of thumbnail strip)

### Thumbnail Strip (Zoomed View)
**Location:** Bottom section (lines 316-375 in trim-screen.tsx)
**Purpose:** Provides frame-accurate editing and precision navigation

**Elements:**
- Horizontal scrollable strip of frame thumbnails
- Draggable background (for panning)
- Start marker (draggable handle, green)
- End marker (draggable handle, red)
- Selection overlay (semi-transparent fill)
- Zoom controls (mouse wheel, keyboard)
- Mini-timeline indicator below (shows position within full video)

## Interaction Specifications

### 1. Scrubber and Scroller Connection

#### Synchronization Behavior
- **Scrubber:** Always displays full video timeline (0 to duration)
- **Thumbnail Strip:** Displays zoomed portion based on zoom level
- **Viewport Indicator:** Semi-transparent rectangle on scrubber showing visible thumbnail range
- **Click-to-Seek:** Clicking scrubber pans thumbnail strip to that position
- **Auto-Scroll:** During playback, thumbnail strip pans to keep playhead centered/visible

#### Visual Feedback
- Viewport indicator uses subtle border/fill to show thumbnail strip's visible range
- Identical start/end markers appear on both scrubber and thumbnail strip
- Selection overlay color/opacity matches on both components

### 2. Draggable Start/End Markers

#### Marker Placement
- **Both locations:** Markers appear on timeline scrubber AND thumbnail strip
- **Synchronized:** Dragging on either view updates both immediately
- **Visual handles:**
  - Start marker: Green handle with left edge affordance
  - End marker: Red handle with right edge affordance
  - Minimum size: 12px × 12px for touch/click targets

#### Drag Interaction
```
User Action → System Response
──────────────────────────────────────────────────────
Hover marker → Cursor: ew-resize (↔)
              Marker: Slight scale increase (1.1x)

Click & hold → Marker: Scale to 1.2x, add drop shadow
               Video: Pause playback (optional)

Drag left/right → Marker: Follows mouse, snaps to frame boundaries
                  Video: Seeks to marker position (real-time preview)
                  Timestamp: Show tooltip with time (e.g., "0:15.33")

Drag start past end → Automatically swap start ↔ end markers
                      Show brief toast: "Markers swapped"

Release → Marker: Return to normal size
          Tooltip: Fade out
          Video: Remain at new position
```

#### Frame Snapping
- **During drag:** Snap to nearest frame boundary based on detected framerate
- **Snap function:** Use existing `snapTimeToFrame` utility (lib/time-utils.ts)
- **Visual feedback:** Marker "jumps" subtly to snapped position
- **No framerate:** Fall back to 30fps grid if framerate detection fails

#### Real-Time Preview
- **Video element:** Seeks to marker position as it's dragged (throttled to 16ms)
- **Thumbnail highlight:** Current frame thumbnail highlights in strip
- **Performance:** Use `requestAnimationFrame` for smooth updates
- **Throttling:** Maximum 60fps updates to prevent performance issues

#### Edge Panning
- **Trigger zone:** When dragging within 50px of thumbnail strip edge
- **Behavior:** Auto-scroll thumbnail strip to reveal more frames
- **Speed:** Proportional to distance from edge (closer = faster)
- **Direction:** Pans in direction of approaching edge

### 3. Scroller Navigation

#### Pan (Horizontal Drag)
```
Interaction: Click and drag thumbnail strip background
Cursor: grab → grabbing
Behavior: Pan timeline left/right
Constraints: Cannot pan beyond video start (0) or end (duration)
Inertia: Optional momentum scrolling on release
```

#### Zoom
```
Primary: Mouse wheel (no modifiers)
  - Scroll up: Zoom in (show fewer thumbnails, more detail)
  - Scroll down: Zoom out (show more thumbnails, less detail)
  - Center: Mouse cursor position

Secondary: Ctrl+Wheel (alternative for accessibility)
  - Same behavior as primary

Keyboard:
  - Ctrl + Plus: Zoom in
  - Ctrl + Minus: Zoom out
  - Center: Playhead position

Touch: Pinch gesture (two-finger)
  - Pinch out: Zoom in
  - Pinch in: Zoom out
  - Center: Midpoint between fingers

Limits:
  - Min zoom: Entire video fits in viewport (all thumbnails visible)
  - Max zoom: One frame per thumbnail (or finer if practical)
```

#### Keyboard Navigation
```
Arrow Left: Pan left by 10% of visible range
Arrow Right: Pan right by 10% of visible range
Shift + Arrow Left: Pan to start (0)
Shift + Arrow Right: Pan to end (duration)
Page Up: Pan left by 100% of visible range
Page Down: Pan right by 100% of visible range
Home: Jump to start (0)
End: Jump to end (duration)
```

#### Auto-Scroll During Playback
- **Trigger:** When playhead moves outside visible thumbnail range during playback
- **Behavior:** Smoothly pan thumbnail strip to keep playhead centered
- **Smoothing:** Ease-out animation over 200ms
- **User override:** If user manually pans/zooms during playback, disable auto-scroll temporarily
- **Re-enable:** Re-enable auto-scroll on next playback start or after 2 seconds of inactivity

### 4. Default Start/End State

#### Initial State on Page Load
```javascript
// State initialization
const [startTime, setStartTime] = useState(0)  // Changed from null to 0
const [endTime, setEndTime] = useState(duration)  // Changed from null to duration
```

#### Visual State
- Start marker visible at 0:00.00 (leftmost position)
- End marker visible at duration (rightmost position)
- Selection overlay visible, covering entire timeline
- Selection info displays: "Start: 0:00 | End: [duration] | Duration: [duration]"

#### Button State
- "Mark Start" button label: "Update Start" (indicates marker already exists)
- "Mark End" button label: "Update End"
- "Clear Selection" button: Enabled (resets to defaults)
- "Split"/"Process" button: Enabled (will process entire video if untouched)

#### Processing Behavior
- If user clicks "Process" with defaults (0 to duration), proceed without warning
- FFmpeg command will copy entire video (effectively a format conversion/copy operation)
- No need to warn user since this is a valid use case

## Visual Design Specifications

### Marker Design

#### Start Marker (Green)
```
Shape: Vertical handle with left-pointing triangle
Color: #10b981 (green-500)
Size: 16px × 24px (normal), 20px × 30px (hover), 24px × 36px (dragging)
Border: 2px solid white (for contrast)
Shadow: 0 2px 4px rgba(0,0,0,0.2) (normal), 0 4px 8px rgba(0,0,0,0.3) (dragging)
Label: "S" or "►" icon
```

#### End Marker (Red)
```
Shape: Vertical handle with right-pointing triangle
Color: #ef4444 (red-500)
Size: 16px × 24px (normal), 20px × 30px (hover), 24px × 36px (dragging)
Border: 2px solid white (for contrast)
Shadow: 0 2px 4px rgba(0,0,0,0.2) (normal), 0 4px 8px rgba(0,0,0,0.3) (dragging)
Label: "E" or "◄" icon
```

### Selection Overlay
```
Fill: rgba(251, 191, 36, 0.2) (yellow with 20% opacity)
Border: 2px solid #fbbf24 (yellow-400)
Border style: Dashed (for distinction from solid markers)
Hover: Increase opacity to 0.3
```

### Viewport Indicator (on Scrubber)
```
Fill: rgba(59, 130, 246, 0.15) (blue with 15% opacity)
Border: 2px solid #3b82f6 (blue-500)
Min width: 20px (even when zoomed far in)
Cursor: pointer (clicking jumps thumbnail strip to that position)
```

### Tooltips During Drag
```
Position: 10px above marker
Background: rgba(0, 0, 0, 0.85)
Text color: white
Padding: 4px 8px
Border radius: 4px
Font: 12px monospace
Content: "0:15.33" (M:SS.FF format)
Arrow: 6px triangle pointing to marker
```

### Cursor States
```
Marker hover: ew-resize (↔)
Marker dragging: grabbing
Thumbnail background hover: grab
Thumbnail background dragging: grabbing
Scrubber background: pointer
```

### Selection Info Display
```
Location: Below thumbnail strip (existing component, lines shown in trim-screen.tsx)
Update: Add "selected" or "trimmed" label
Format: "Selected: 0:05 → 0:30 (0:25 duration)"
Color: Green text if valid selection, red if invalid (start = end)
```

## Technical Requirements

### State Management

#### Primary State
```typescript
// Enhanced state structure
interface TrimState {
  // Marker positions (dual storage for flexibility)
  startTime: number;           // in seconds (e.g., 5.5)
  startFrame: number;          // frame number (e.g., 165 at 30fps)
  endTime: number;             // in seconds
  endFrame: number;            // frame number

  // Viewport state for thumbnail strip
  visibleStartTime: number;    // Start of visible range in thumbnails
  visibleEndTime: number;      // End of visible range in thumbnails
  zoomLevel: number;           // Current zoom factor (1 = fit all, >1 = zoomed)

  // UI state
  isDraggingStart: boolean;
  isDraggingEnd: boolean;
  isPanning: boolean;
  autoScrollEnabled: boolean;
}
```

#### Derived Values
```typescript
// Computed from state
const selectionDuration = endTime - startTime;
const visibleDuration = visibleEndTime - visibleStartTime;
const viewportIndicatorLeft = (visibleStartTime / duration) * 100;  // %
const viewportIndicatorWidth = (visibleDuration / duration) * 100;   // %
```

#### Synchronization Functions
```typescript
// Convert between timestamps and frames
function timeToFrame(time: number, framerate: number): number {
  return Math.round(time * framerate);
}

function frameToTime(frame: number, framerate: number): number {
  return frame / framerate;
}

// Update both representations when marker changes
function setStartMarker(time: number) {
  const snappedTime = snapTimeToFrame(time, framerate);
  const frame = timeToFrame(snappedTime, framerate);
  setStartTime(snappedTime);
  setStartFrame(frame);
}
```

### Event Handlers

#### Marker Drag Handlers
```typescript
// Start marker drag
const handleStartMarkerMouseDown = (e: React.MouseEvent) => {
  e.preventDefault();
  setIsDraggingStart(true);

  const handleMouseMove = (moveEvent: MouseEvent) => {
    const newTime = calculateTimeFromMousePosition(moveEvent);
    const snappedTime = snapTimeToFrame(newTime, framerate);

    // Check for swap condition
    if (snappedTime > endTime) {
      // Swap markers
      setStartMarker(endTime);
      setEndMarker(snappedTime);
      showToast("Markers swapped");
    } else {
      setStartMarker(snappedTime);
    }

    // Real-time preview (throttled)
    if (videoRef.current) {
      videoRef.current.currentTime = snappedTime;
    }
  };

  const handleMouseUp = () => {
    setIsDraggingStart(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};
```

#### Thumbnail Strip Pan Handler
```typescript
const handleThumbnailPanStart = (e: React.MouseEvent) => {
  // Only pan if clicking background, not markers or thumbnails
  if (e.target !== thumbnailStripRef.current) return;

  e.preventDefault();
  setIsPanning(true);

  const startX = e.clientX;
  const startVisibleTime = visibleStartTime;

  const handleMouseMove = (moveEvent: MouseEvent) => {
    const deltaX = moveEvent.clientX - startX;
    const deltaTime = (deltaX / containerWidthPx) * visibleDuration;

    let newVisibleStart = startVisibleTime - deltaTime;

    // Constrain to video bounds
    newVisibleStart = Math.max(0, Math.min(newVisibleStart, duration - visibleDuration));

    setVisibleStartTime(newVisibleStart);
    setVisibleEndTime(newVisibleStart + visibleDuration);
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};
```

#### Zoom Handler
```typescript
const handleThumbnailZoom = (e: WheelEvent) => {
  e.preventDefault();

  const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;  // Zoom out : Zoom in
  const newZoomLevel = Math.max(1, Math.min(zoomLevel * zoomDelta, 100));

  // Calculate new visible duration
  const newVisibleDuration = duration / newZoomLevel;

  // Zoom centered on mouse position
  const mouseTimeInVisible = visibleStartTime +
    (e.offsetX / containerWidthPx) * visibleDuration;

  const mouseRatioInNew = (mouseTimeInVisible - visibleStartTime) / visibleDuration;
  let newVisibleStart = mouseTimeInVisible - (mouseRatioInNew * newVisibleDuration);

  // Constrain to bounds
  newVisibleStart = Math.max(0, Math.min(newVisibleStart, duration - newVisibleDuration));

  setZoomLevel(newZoomLevel);
  setVisibleStartTime(newVisibleStart);
  setVisibleEndTime(newVisibleStart + newVisibleDuration);
};
```

#### Auto-Scroll Handler
```typescript
useEffect(() => {
  if (!isPlaying || !autoScrollEnabled) return;

  const checkAutoScroll = () => {
    if (currentTime < visibleStartTime || currentTime > visibleEndTime) {
      // Playhead is outside visible range, center it
      const halfVisible = visibleDuration / 2;
      let newVisibleStart = currentTime - halfVisible;

      // Constrain
      newVisibleStart = Math.max(0, Math.min(newVisibleStart, duration - visibleDuration));

      // Smooth transition
      animateToPosition(newVisibleStart, 200);
    }
  };

  const interval = setInterval(checkAutoScroll, 100);
  return () => clearInterval(interval);
}, [isPlaying, currentTime, visibleStartTime, visibleEndTime, autoScrollEnabled]);
```

### Performance Optimizations

#### Throttling Real-Time Preview
```typescript
import { throttle } from 'lodash';

const updateVideoPreview = throttle((time: number) => {
  if (videoRef.current) {
    videoRef.current.currentTime = time;
  }
}, 16);  // ~60fps max
```

#### Thumbnail Generation
- Continue using existing `useFFmpegThumbnails` hook
- Prioritize visible range + 1 screen buffer on each side
- Generate thumbnails in background for full video (low priority)
- Cache all generated thumbnails in `thumbnailCacheAtom`

#### Edge Panning
```typescript
const handleEdgePanning = (mouseX: number) => {
  const edgeThreshold = 50;  // px from edge
  const maxSpeed = 5;  // px per frame

  if (mouseX < edgeThreshold) {
    const speed = ((edgeThreshold - mouseX) / edgeThreshold) * maxSpeed;
    panLeft(speed);
  } else if (mouseX > containerWidthPx - edgeThreshold) {
    const speed = ((mouseX - (containerWidthPx - edgeThreshold)) / edgeThreshold) * maxSpeed;
    panRight(speed);
  }
};
```

## Edge Cases & Validation

### Boundary Conditions

#### Start = End
- **Allow:** Yes (valid use case: extract single frame)
- **Visual:** Show warning icon with tooltip "Single frame selected"
- **Processing:** FFmpeg extracts that frame as image or 1-frame video

#### Start at 0, End at Duration
- **Allow:** Yes (default state, copies entire video)
- **Visual:** Normal appearance, no warning needed
- **Processing:** FFmpeg copies entire video with `-c copy`

#### Very Short Videos (<1 second)
- **Behavior:** Reduce min zoom level to ensure frames are distinguishable
- **Markers:** Ensure touch targets remain 12px minimum
- **Snapping:** Use detected framerate even if only a few frames exist

#### No Detectable Framerate
- **Fallback:** Assume 30fps for snapping calculations
- **Visual:** Show info icon with tooltip "Framerate detection failed, using 30fps"
- **Processing:** FFmpeg will use actual framerate from video metadata

#### Marker Dragging Off-Screen
- **Scrubber:** Markers cannot go outside 0-duration bounds (constrain)
- **Thumbnail strip:** Auto-scroll to keep dragged marker visible (edge panning)

### Invalid States to Prevent
- ❌ startTime < 0
- ❌ endTime > duration
- ❌ startTime or endTime is NaN
- ❌ Markers exist but are not draggable (must be interactive)

### Validation Function
```typescript
function validateMarkers(start: number, end: number, duration: number): boolean {
  if (isNaN(start) || isNaN(end)) return false;
  if (start < 0 || end > duration) return false;
  // Note: start >= end is allowed (will auto-swap during drag)
  return true;
}
```

## Implementation Notes

### Files to Modify

#### `/components/operations/trim-screen.tsx`
**Changes:**
- Initialize `startTime` to 0 and `endTime` to duration (not null)
- Add `startFrame`, `endFrame`, `visibleStartTime`, `visibleEndTime`, `zoomLevel` state
- Implement marker drag handlers with swap logic
- Implement thumbnail strip pan handler
- Add viewport indicator to scrubber
- Update marker rendering to show draggable handles (green/red)
- Add tooltips during drag
- Modify "Mark Start/End" buttons to "Update Start/End"

#### `/lib/use-thumbnail-zoom.ts`
**Changes:**
- Accept `visibleStartTime` and `visibleEndTime` as controlled props
- Expose `setVisibleRange` function for external control (from scrubber clicks, panning)
- Add zoom level state and constraints (min = 1, max = 100)

#### `/lib/time-utils.ts`
**New Functions:**
```typescript
export function timeToFrame(time: number, framerate: number): number;
export function frameToTime(frame: number, framerate: number): number;
export function calculateTimeFromMousePosition(
  mouseX: number,
  containerWidth: number,
  visibleStart: number,
  visibleEnd: number
): number;
```

#### New Hook: `/lib/use-marker-drag.ts`
**Purpose:** Encapsulate marker drag logic
```typescript
export function useMarkerDrag({
  videoRef,
  framerate,
  duration,
  onStartChange,
  onEndChange,
  onSwap
}: MarkerDragOptions) {
  // Returns handlers and state for dragging markers
}
```

### Component Hierarchy
```
TrimScreen
├── VideoPlayer (existing)
├── ControlBar (existing)
├── TimelineScrubber (enhanced)
│   ├── ProgressBar
│   ├── CurrentTimeIndicator
│   ├── StartMarker (draggable, green)
│   ├── EndMarker (draggable, red)
│   ├── SelectionOverlay
│   └── ViewportIndicator (new)
├── ThumbnailStrip (enhanced)
│   ├── DraggableBackground (new)
│   ├── ThumbnailList
│   ├── StartMarker (draggable, green)
│   ├── EndMarker (draggable, red)
│   ├── SelectionOverlay
│   └── MiniTimelineIndicator (existing)
├── SelectionInfo (enhanced)
└── ProcessingButton (existing)
```

### Testing Checklist

#### Functional Testing
- [ ] On page load, markers appear at 0 and duration
- [ ] Dragging start marker on scrubber updates both views
- [ ] Dragging end marker on scrubber updates both views
- [ ] Dragging start marker on thumbnail strip updates both views
- [ ] Dragging end marker on thumbnail strip updates both views
- [ ] Dragging start past end swaps them automatically
- [ ] Dragging end before start swaps them automatically
- [ ] Markers snap to frame boundaries during drag
- [ ] Video preview updates in real-time while dragging
- [ ] Clicking scrubber pans thumbnail strip to that position
- [ ] Dragging anywhere on thumbnail strip (except markers) pans the timeline
- [ ] Mouse wheel on thumbnails zooms in/out
- [ ] Viewport indicator shows visible thumbnail range on scrubber
- [ ] During playback, thumbnails auto-scroll to keep playhead visible
- [ ] Arrow keys pan the timeline
- [ ] Tooltips show time during drag
- [ ] "Mark Start/End" buttons update to "Update Start/End"
- [ ] "Clear Selection" resets to 0 and duration
- [ ] Processing with defaults (0-duration) works correctly

#### Edge Case Testing
- [ ] Very short video (<1 sec) displays correctly
- [ ] Very long video (>1 hour) performs well
- [ ] Setting start = end shows single frame selection
- [ ] No framerate detection falls back to 30fps
- [ ] Dragging near edge triggers edge panning
- [ ] Rapid dragging doesn't cause lag or dropped frames
- [ ] Zooming to max level shows individual frames
- [ ] Zooming to min level shows entire video

#### Visual Testing
- [ ] Start marker is visibly green
- [ ] End marker is visibly red
- [ ] Markers have distinct appearance from playhead
- [ ] Selection overlay is visible but doesn't obscure content
- [ ] Viewport indicator is subtle but clear
- [ ] Cursors change appropriately on hover
- [ ] Tooltips are readable and positioned correctly
- [ ] Markers scale smoothly on hover/drag

#### Accessibility Testing
- [ ] Markers are keyboard accessible (tab to focus)
- [ ] Arrow keys adjust marker positions when focused
- [ ] Screen readers announce marker positions
- [ ] High contrast mode works correctly
- [ ] Touch targets are minimum 44×44px on mobile

## Future Enhancements (Out of Scope for V1)

### Nice-to-Have Features
1. **Multi-range selection:** Select multiple trim ranges for advanced editing
2. **Bookmark markers:** Add named markers for reference points
3. **Waveform display:** Show audio waveform on timeline
4. **Thumbnail preview on hover:** Preview frames while hovering scrubber
5. **Undo/Redo:** Undo marker position changes
6. **URL state:** Save marker positions in URL for sharing
7. **Preset trim templates:** Quick presets like "Remove first 5 sec", "Remove credits"
8. **Selection range templates:** Save custom ranges for reuse
9. **Snap to scene changes:** Auto-snap markers to detected scene boundaries
10. **Timeline ruler:** Show timecode ruler with major/minor ticks

### Performance Improvements
1. **Web Worker thumbnails:** Move thumbnail generation to Web Worker
2. **Virtual scrolling:** Render only visible thumbnails for very long videos
3. **GPU acceleration:** Use WebGL for smooth animations
4. **Thumbnail quality levels:** Load low-res for overview, high-res for precision editing

---

**Document Version:** 1.0
**Date:** 2026-01-18
**Status:** Ready for Implementation
