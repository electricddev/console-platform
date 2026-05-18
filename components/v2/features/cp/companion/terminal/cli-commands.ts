import type { CompanionContextValue } from '../companion-panel.types'

export type ParsedCommand = { name: string; args: string[]; flags: Record<string, string | true> }

export type CliOutputBlock =
  | { kind: 'text'; lines: string[] }
  | { kind: 'table'; headers: string[]; rows: string[][] }
  | { kind: 'error'; message: string }

export type CommandDef = {
  name: string
  summary: string
  run: (input: ParsedCommand, ctx: CompanionContextValue) => CliOutputBlock[]
}

const COMMANDS: CommandDef[] = [
  {
    name: 'validate',
    summary: 'Run all pre-submit checks.',
    run: (_input, _ctx) => [
      { kind: 'text', lines: ['✓ syntax', '✓ policy', '✓ lineage', '⚠ no tests defined'] },
    ],
  },
  {
    name: 'dry-run',
    summary: 'Preview output rows for the current SELECT.',
    run: (input, _ctx) => {
      const limit = parseInt(String(input.flags.limit ?? '5'), 10)
      const SAMPLE: string[][] = [
        ['0.85', '425,371,892.54', '478,231,015.22', '2026-05-15T14:22:18Z'],
        ['0.84', '419,205,119.18', '482,007,283.61', '2026-05-15T14:21:14Z'],
      ]
      const rows: string[][] = []
      for (let i = 0; i < Math.min(limit, SAMPLE.length); i++) rows.push(SAMPLE[i])
      return [
        {
          kind: 'table',
          headers: ['advance_rate', 'nav_usd', 'eligible_par', 'as_of'],
          rows,
        },
      ]
    },
  },
  {
    name: 'diff',
    summary: 'Diff current analysis against another ref. Usage: hyve diff <ref>',
    run: (input) =>
      input.args[0]
        ? [{ kind: 'text', lines: [`+3 −1 lines vs ${input.args[0]} · 2 new columns`] }]
        : [{ kind: 'error', message: 'Usage: hyve diff <ref>' }],
  },
  {
    name: 'sign',
    summary: 'Show what the signed payload would look like. Use --dry to skip side-effects.',
    run: (input) => [
      {
        kind: 'text',
        lines: [
          input.flags.dry ? 'Would publish (dry-run):' : 'Publishing (mock):',
          '  payload: 0xa3b1f04c… (1.2KB)',
          '  asOf:    2026-05-15T14:22:18Z',
          '  sig:     0xf04ca3b1… (65 bytes)',
        ],
      },
    ],
  },
  {
    name: 'tests',
    summary: 'Run defined assertions. Usage: hyve tests run',
    run: (input) =>
      input.args[0] === 'run'
        ? [
            {
              kind: 'text',
              lines: [
                'Running 3 assertions…',
                '✓ nav between 0.5 and 2.0',
                '✓ asof not_null',
                '⚠ asset_count = 47 (no data)',
              ],
            },
          ]
        : [{ kind: 'error', message: 'Usage: hyve tests run' }],
  },
  {
    name: 'cost',
    summary: 'Show estimated cost per execution and monthly projection.',
    run: () => [
      {
        kind: 'text',
        lines: [
          'Per execution · $0.4512',
          '  compute  $0.0012',
          '  base gas $0.4500',
          'Per month   · ~$48.50 (~22 runs)',
        ],
      },
    ],
  },
  {
    name: 'help',
    summary: 'List commands or show help for one.',
    run: () => [
      {
        kind: 'text',
        lines: COMMANDS.map((c) => `${c.name.padEnd(10)} ${c.summary}`),
      },
    ],
  },
  { name: 'clear', summary: 'Clear scrollback.', run: () => [] },
  {
    name: 'history',
    summary: 'Show recent commands.',
    run: () => [{ kind: 'text', lines: ['(history is rendered inline — handled by the REPL)'] }],
  },
]

export function listCommands(): CommandDef[] {
  return COMMANDS
}

export function parseCommand(raw: string): ParsedCommand | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const tokens = trimmed.split(/\s+/)
  const name = tokens.shift()!
  const args: string[] = []
  const flags: Record<string, string | true> = {}
  while (tokens.length > 0) {
    const t = tokens.shift()!
    if (t.startsWith('--')) {
      const key = t.slice(2)
      const next = tokens[0]
      if (next && !next.startsWith('--')) {
        flags[key] = next
        tokens.shift()
      } else {
        flags[key] = true
      }
    } else {
      args.push(t)
    }
  }
  return { name, args, flags }
}

export function completeCommand(prefix: string): string[] {
  if (!prefix) return COMMANDS.map((c) => c.name)
  return COMMANDS.map((c) => c.name).filter((n) => n.startsWith(prefix))
}

export function runCommand(raw: string, ctx: CompanionContextValue): CliOutputBlock[] {
  const parsed = parseCommand(raw)
  if (!parsed) return []
  if (parsed.name === 'clear') return []
  const def = COMMANDS.find((c) => c.name === parsed.name)
  if (!def) return [{ kind: 'error', message: `Unknown command: ${parsed.name}. Try \`help\`.` }]
  return def.run(parsed, ctx)
}
