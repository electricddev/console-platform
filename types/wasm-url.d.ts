/**
 * Type declarations for Vite/Turbopack `?url` import suffix.
 * Allows importing static assets (WASM, workers) as URL strings at build time.
 */
declare module '*?url' {
  const src: string
  export default src
}
