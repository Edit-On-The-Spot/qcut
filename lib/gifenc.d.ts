declare module "gifenc" {
  /**
   * Creates a new GIF encoder instance.
   */
  export function GIFEncoder(): GIFEncoderInstance

  export interface GIFEncoderInstance {
    /**
     * Writes a frame to the GIF.
     * @param index - Indexed pixel data (values 0-255 referencing palette)
     * @param width - Frame width
     * @param height - Frame height
     * @param options - Frame options
     */
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      options?: WriteFrameOptions
    ): void

    /**
     * Finishes the GIF and prepares the output bytes.
     */
    finish(): void

    /**
     * Returns the encoded GIF as a Uint8Array.
     */
    bytes(): Uint8Array

    /**
     * Returns the encoded GIF as a Uint8Array (alias for bytes).
     */
    bytesView(): Uint8Array
  }

  export interface WriteFrameOptions {
    /**
     * The color palette for this frame (array of [r, g, b] tuples).
     */
    palette?: number[][]
    /**
     * Delay in milliseconds before showing the next frame.
     */
    delay?: number
    /**
     * Disposal method for the frame.
     */
    dispose?: number
    /**
     * Transparent color index.
     */
    transparent?: number | boolean
  }

  /**
   * Quantizes RGB pixel data to a color palette.
   * @param rgba - RGBA pixel data (Uint8Array or Uint8ClampedArray)
   * @param maxColors - Maximum number of colors in palette (up to 256)
   * @param options - Quantization options
   * @returns Color palette as array of [r, g, b] tuples
   */
  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: QuantizeOptions
  ): number[][]

  export interface QuantizeOptions {
    /**
     * Format of input data: "rgb" or "rgba"
     */
    format?: "rgb" | "rgba"
    /**
     * Whether to clear alpha channel
     */
    clearAlpha?: boolean
    /**
     * Alpha threshold for transparency
     */
    clearAlphaThreshold?: number
    /**
     * Color to replace transparent pixels
     */
    clearAlphaColor?: number
  }

  /**
   * Applies a palette to RGBA pixel data, producing indexed pixel data.
   * @param rgba - RGBA pixel data
   * @param palette - Color palette from quantize()
   * @param options - Options for applying palette
   * @returns Indexed pixel data (Uint8Array)
   */
  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: number[][],
    options?: ApplyPaletteOptions
  ): Uint8Array

  export interface ApplyPaletteOptions {
    /**
     * Format of input data: "rgb" or "rgba"
     */
    format?: "rgb" | "rgba"
    /**
     * Dithering method: "none", "atkinson", etc.
     */
    dither?: boolean | string
  }

  /**
   * Finds the nearest color index in a palette for a given RGB color.
   */
  export function nearestColorIndex(
    palette: number[][],
    r: number,
    g: number,
    b: number
  ): number

  /**
   * Finds the nearest color index in a palette with caching.
   */
  export function nearestColorIndexWithDistance(
    palette: number[][],
    r: number,
    g: number,
    b: number
  ): [number, number]

  /**
   * Snaps a color to the nearest palette color.
   */
  export function snapColorToPalette(
    palette: number[][],
    r: number,
    g: number,
    b: number
  ): number[]

  /**
   * Computes the squared Euclidean distance between two colors.
   */
  export function colorDistance(
    r1: number,
    g1: number,
    b1: number,
    r2: number,
    g2: number,
    b2: number
  ): number
}
