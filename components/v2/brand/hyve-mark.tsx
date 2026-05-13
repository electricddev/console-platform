import type { SVGProps } from 'react'

const VIEWBOX_WIDTH = 120
const VIEWBOX_HEIGHT = 138
const ASPECT_RATIO = VIEWBOX_HEIGHT / VIEWBOX_WIDTH

export interface HyveMarkProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  /**
   * Rendered width in pixels. Height is derived from the native 120:138 aspect
   * ratio to prevent distortion. Defaults to 20.
   */
  size?: number
  /**
   * Accessible name. When omitted, the mark is treated as decorative
   * (`aria-hidden`) — the default for brand marks placed next to a wordmark.
   */
  title?: string
}

/**
 * Hyve honeycomb brandmark — six tiled hexagons that compose a larger
 * hexagonal silhouette. The path uses `fill="currentColor"` so the mark
 * inherits its color from the nearest text-color utility. Pair with a
 * `text-*` class to theme.
 */
export function HyveMark({ size = 20, title, className, ...rest }: HyveMarkProps) {
  const width = size
  const height = Math.round(size * ASPECT_RATIO)
  const labelled = Boolean(title)

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      fill="none"
      role={labelled ? 'img' : undefined}
      aria-hidden={labelled ? undefined : true}
      aria-label={labelled ? title : undefined}
      focusable="false"
      className={className}
      {...rest}
    >
      <path
        fill="currentColor"
        d="M69.835 97.6758L79.7959 103.399L79.7725 114.888L79.7959 126.377L69.835 132.101L59.8975 137.865L49.959 132.101L39.998 126.377L40.0215 114.888L39.998 103.399L49.959 97.6758L59.8975 91.9102L69.835 97.6758ZM29.8369 74.6973L39.7988 80.4219L39.7744 91.9102L39.7988 103.399L29.8369 109.123L19.8994 114.888L9.96094 109.123L0 103.399L0.0234375 91.9102L0 80.4219L9.96094 74.6973L19.8994 68.9326L29.8369 74.6973ZM109.833 74.6973L119.795 80.4219L119.771 91.9102L119.795 103.399L109.833 109.123L99.8955 114.888L89.957 109.123L79.9961 103.399L80.0195 91.9102L79.9961 80.4219L89.957 74.6973L99.8955 68.9326L109.833 74.6973ZM29.8369 28.7422L39.7988 34.4668L39.7744 45.9551L39.7988 57.4443L29.8369 63.168L19.8994 68.9326L9.96094 63.168L0 57.4443L0.0234375 45.9551L0 34.4668L9.96094 28.7422L19.8994 22.9775L29.8369 28.7422ZM109.833 28.7422L119.795 34.4668L119.771 45.9551L119.795 57.4443L109.833 63.168L99.8955 68.9326L89.957 63.168L79.9961 57.4443L80.0195 45.9551L79.9961 34.4668L89.957 28.7422L99.8955 22.9775L109.833 28.7422ZM69.835 5.76465L79.7959 11.4883L79.7725 22.9775L79.7959 34.4658L69.835 40.1904L59.8975 45.9551L49.959 40.1904L39.998 34.4658L40.0215 22.9775L39.998 11.4883L49.959 5.76465L59.8975 0L69.835 5.76465Z"
      />
    </svg>
  )
}
