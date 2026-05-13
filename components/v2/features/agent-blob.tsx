'use client'

interface BlobProps {
  hex: string
  hexEnd: string
  id: string
}

export function AgentBlob({ hex, hexEnd, id }: BlobProps) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 90%, ${hex}35 0%, ${hexEnd}15 40%, transparent 70%)`,
          filter: 'blur(20px)',
        }}
      />
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.2] mix-blend-multiply dark:mix-blend-soft-light"
        aria-hidden
      >
        <filter id={`g-${id}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#g-${id})`} />
      </svg>
    </div>
  )
}

interface ProjectBlobsProps {
  swatches: { hex: string }[]
  id: string
}

export function ProjectBlobs({ swatches, id }: ProjectBlobsProps) {
  const positions = [
    { pos: '75% 30%', size: '55% 60%' },
    { pos: '90% 65%', size: '50% 55%' },
    { pos: '65% 80%', size: '45% 50%' },
    { pos: '85% 15%', size: '40% 45%' },
    { pos: '70% 50%', size: '50% 50%' },
  ]
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
      <div
        className="absolute inset-0"
        style={{
          background: swatches
            .map((s, i) => {
              const p = positions[i % positions.length]
              return `radial-gradient(ellipse ${p.size} at ${p.pos}, ${s.hex}40 0%, transparent 70%)`
            })
            .join(', '),
          filter: 'blur(22px)',
        }}
      />
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.2] mix-blend-multiply dark:mix-blend-soft-light"
        aria-hidden
      >
        <filter id={`gp-${id}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#gp-${id})`} />
      </svg>
    </div>
  )
}
