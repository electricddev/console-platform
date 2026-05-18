import { describe, it, expect } from 'vitest'
import {
  parseCommand,
  listCommands,
  completeCommand,
} from '@/components/v2/features/cp/companion/terminal/cli-commands'

describe('parseCommand', () => {
  it('parses a bare command', () => {
    expect(parseCommand('validate')).toEqual({ name: 'validate', args: [], flags: {} })
  })
  it('parses flags with values', () => {
    expect(parseCommand('dry-run --limit 5')).toEqual({ name: 'dry-run', args: [], flags: { limit: '5' } })
  })
  it('parses boolean flags', () => {
    expect(parseCommand('sign --dry')).toEqual({ name: 'sign', args: [], flags: { dry: true } })
  })
  it('parses positional args', () => {
    expect(parseCommand('diff main')).toEqual({ name: 'diff', args: ['main'], flags: {} })
  })
  it('returns null for empty input', () => {
    expect(parseCommand('   ')).toBeNull()
  })
})

describe('completeCommand', () => {
  it('returns matching command names for a prefix', () => {
    expect(completeCommand('val')).toEqual(['validate'])
    expect(completeCommand('d')).toEqual(expect.arrayContaining(['dry-run', 'diff']))
  })
  it('returns empty array on no match', () => {
    expect(completeCommand('zzz')).toEqual([])
  })
})

describe('listCommands', () => {
  it('includes the documented commands', () => {
    const names = listCommands().map((c) => c.name)
    expect(names).toEqual(
      expect.arrayContaining(['validate', 'dry-run', 'diff', 'sign', 'tests', 'cost', 'help', 'clear', 'history']),
    )
  })
})
