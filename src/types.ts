export type ActionType =
  | "convert"
  | "compress"
  | "trim"
  | "extract-audio"
  | "merge"
  | "gif"
  | "resize"
  | "frame-extract"
  | "combine"
  | "normalize-audio"
  | "rotate"
  | "overlay"

export interface VideoData {
  file: File
  fileData?: Uint8Array
  duration?: number
  width?: number
  height?: number
  codec?: string
  format?: string
}

export interface ActionConfig {
  type: ActionType
  params: Record<string, unknown>
}

export interface RouteConfig {
  title: string
  description: string
  /** Lazy loader for the page module */
  load: () => Promise<PageModule>
}

export interface PageModule {
  default: () => { element: HTMLElement; destroy: () => void }
}

export interface Component {
  element: HTMLElement
  destroy: () => void
}
