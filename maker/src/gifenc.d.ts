declare module 'gifenc' {
  export type GifPalette = number[][]

  export function GIFEncoder(options?: { auto?: boolean }): {
    writeFrame(index: Uint8Array, width: number, height: number, opts?: {
      palette?: GifPalette
      delay?: number
      dispose?: number
      transparent?: boolean
      transparentIndex?: number
      repeat?: number
      colorDepth?: number
    }): void
    finish(): void
    bytes(): Uint8Array
    bytesView(): Uint8Array
  }

  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: { format?: string; oneBitAlpha?: boolean | number },
  ): GifPalette

  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: GifPalette,
    format?: string,
  ): Uint8Array
}
