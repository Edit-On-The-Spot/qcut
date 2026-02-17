import { createElement as lucideCreateElement } from "lucide"
import type { IconNode } from "lucide"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  ExternalLink,
  FileOutput,
  Film,
  FlipHorizontal,
  FlipVertical,
  Github,
  Grid3x3,
  GripVertical,
  Image,
  ImagePlus,
  Layers,
  Lightbulb,
  Loader2,
  Lock,
  Maximize2,
  Merge,
  Minimize2,
  Music,
  Pause,
  Play,
  Plus,
  Repeat,
  RotateCcw,
  RotateCw,
  Scissors,
  Send,
  Target,
  Twitter,
  Upload,
  UserX,
  Volume2,
  VolumeX,
  Wand2,
  X,
  XCircle,
  Zap,
} from "lucide"

/** Registry mapping icon names to their IconNode definitions. */
const iconRegistry: Record<string, IconNode> = {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  ExternalLink,
  FileOutput,
  Film,
  FlipHorizontal,
  FlipVertical,
  Github,
  Grid3x3,
  GripVertical,
  Image,
  ImageIcon: Image,
  ImagePlus,
  Layers,
  Lightbulb,
  Loader2,
  Lock,
  Maximize2,
  Merge,
  Minimize2,
  Music,
  Pause,
  Play,
  Plus,
  Repeat,
  RotateCcw,
  RotateCw,
  Scissors,
  Send,
  Target,
  Twitter,
  Upload,
  UserX,
  Volume2,
  VolumeX,
  Wand2,
  X,
  XCircle,
  Zap,
}

/**
 * Renders a Lucide icon as an SVG element.
 * @param name - The icon name in PascalCase (e.g., "Scissors", "Sun")
 * @param sizePx - Icon size in pixels (default 24)
 * @param className - Optional CSS class to add
 * @returns SVG element
 */
export function icon(name: string, sizePx = 24, className?: string): SVGSVGElement {
  const iconNode = iconRegistry[name]
  if (!iconNode) {
    console.warn(`Icon "${name}" not found in lucide`)
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    svg.setAttribute("width", String(sizePx))
    svg.setAttribute("height", String(sizePx))
    return svg
  }

  const svg = lucideCreateElement(iconNode) as unknown as SVGSVGElement
  svg.setAttribute("width", String(sizePx))
  svg.setAttribute("height", String(sizePx))
  if (className) svg.setAttribute("class", className)

  return svg
}

/**
 * Returns the outer HTML of a Lucide icon SVG.
 * Useful for injecting into innerHTML.
 */
export function iconSvg(name: string, sizePx = 24, className?: string): string {
  const el = icon(name, sizePx, className)
  const wrapper = document.createElement("div")
  wrapper.appendChild(el)
  return wrapper.innerHTML
}
