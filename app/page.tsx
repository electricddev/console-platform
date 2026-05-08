export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <BackgroundField />

        <header className="relative z-10 flex items-center justify-between px-8 py-6 lg:px-16">
          <Wordmark />
          <span className="font-tag rounded-full border border-dashed border-foreground/60 px-3 py-1.5 text-foreground">
            v0.1 · preview
          </span>
        </header>

        <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-8 py-24 text-center lg:px-16">
        <p className="font-tag text-foreground/70 mb-10">
          //&nbsp;&nbsp;Verant Data Room
        </p>

        <h1 className="font-display text-balance text-[clamp(3.5rem,8vw,7.5rem)] text-foreground">
          Verifiable data for
          <br />
          onchain markets.
        </h1>

        <p className="mt-10 max-w-xl text-pretty text-base leading-relaxed text-foreground/65 sm:text-lg">
          Storage, confidential compute, and on-chain attestation in a single
          substrate — so private assets can scale algorithmically, the way
          public ones already do.
        </p>

        <div className="mt-12 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
          <a
            href="#pillars"
            className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
          >
            Read the deck
          </a>
          <a
            href="#pillars"
            className="font-tag inline-flex h-11 items-center justify-center rounded-full border border-foreground/30 px-6 text-foreground/80 transition-colors hover:border-foreground/60 hover:text-foreground"
          >
            How it works →
          </a>
        </div>
        </section>
      </div>

      <section
        id="pillars"
        className="relative z-10 border-y border-border bg-surface"
      >
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 divide-y divide-border/60 md:grid-cols-3 md:divide-x md:divide-y-0">
          <Pillar
            tag="01 / store"
            title="Trustless storage"
            body="Encrypted at rest, addressable by content, auditable by design — without exposing the data itself."
          />
          <Pillar
            tag="02 / verify"
            title="Confidential compute"
            body="Run attestations on private inputs inside enclaves. Outputs ship onchain; the data stays private."
          />
          <Pillar
            tag="03 / prove"
            title="On-chain attestation"
            body="Per-transaction attestations hardcoded into protocol logic — programmatic underwriting at any size."
          />
        </div>
      </section>

      <footer className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-8 py-6 lg:px-16">
        <div className="flex items-center gap-4">
          <Wordmark small />
          <span className="font-tag text-foreground/50">// the gap</span>
        </div>
        <span className="font-tag rounded-full border border-dashed border-foreground/60 px-3 py-1.5 text-foreground">
          deck q2 2026
        </span>
      </footer>
    </main>
  );
}

function Pillar({
  tag,
  title,
  body,
}: {
  tag: string;
  title: string;
  body: string;
}) {
  return (
    <article className="group relative flex flex-col gap-6 p-8 lg:p-12">
      <span className="font-tag text-foreground/55">{tag}</span>
      <h3 className="font-display text-4xl text-foreground sm:text-5xl">
        {title}
      </h3>
      <p className="text-pretty text-foreground/65 leading-relaxed">{body}</p>
      <span
        aria-hidden
        className="absolute right-8 top-8 size-1.5 rounded-full bg-accent opacity-0 transition-opacity group-hover:opacity-100"
      />
    </article>
  );
}

function Wordmark({ small = false }: { small?: boolean }) {
  return (
    <a
      href="/"
      className="inline-flex items-center gap-2.5 text-foreground"
      aria-label="Hyve home"
    >
      <HexMark className={small ? "size-4" : "size-5"} />
      <span
        className={
          small
            ? "font-tag text-[0.875rem] tracking-[0.18em]"
            : "font-tag text-[1rem] tracking-[0.18em]"
        }
      >
        hyve
      </span>
    </a>
  );
}

function HexMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M12 2 21 7v10l-9 5-9-5V7l9-5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M12 8.5 16 11v3l-4 2.5L8 14v-3l4-2.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function BackgroundField() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="bg-dot-grid-dark absolute inset-0" />
      {/* Corner glows — echo the deck's "Why Now" slides where the convergence
          curves rise out of the bottom-left and bottom-right. */}
      <div
        className="absolute inset-0"
        style={{
          background: [
            "radial-gradient(70% 65% at 0% 100%, oklch(0.78 0.10 256 / 0.50), transparent 65%)",
            "radial-gradient(70% 65% at 100% 100%, oklch(0.78 0.10 256 / 0.50), transparent 65%)",
            "radial-gradient(45% 45% at 100% 0%, oklch(0.78 0.08 256 / 0.22), transparent 70%)",
            "radial-gradient(45% 45% at 0% 0%, oklch(0.78 0.08 256 / 0.18), transparent 70%)",
          ].join(", "),
        }}
      />
      {/* Soft fade so the dot grid melts into the background near the edges. */}
      <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-background via-background/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-background via-background/60 to-transparent" />
    </div>
  );
}
