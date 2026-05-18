import { describe, it, expect } from 'vitest'
import { generateCode, type PayloadField } from '@/components/v2/features/cp/companion/integration-codegen'

const fields: PayloadField[] = [
  { name: 'asof', sqlType: 'TIMESTAMP', abiType: 'uint64', exampleSql: '2026-05-15…', exampleAbi: '1715789138', source: 'derived' },
  { name: 'nav', sqlType: 'NUMERIC', abiType: 'uint256', exampleSql: '1.024500', exampleAbi: '1024500000000000000', source: 'vault.acred.nav_calc' },
  { name: 'asset_count', sqlType: 'INT', abiType: 'uint16', exampleSql: '47', exampleAbi: '47', source: 'vault.acred.asset_count' },
]

describe('generateCode', () => {
  it('emits Solidity with abi.decode order matching the field list', () => {
    const out = generateCode('solidity', fields, { contractAddress: '0xabc', analysisSlug: 'nav_daily' })
    expect(out).toMatch(/abi\.decode\(payload, \(uint64, uint256, uint16\)\)/)
    expect(out).toContain('"nav_daily"')
  })
  it('emits TypeScript with each field as a typed const', () => {
    const out = generateCode('typescript', fields, { analysisSlug: 'nav_daily' })
    expect(out).toContain('result.asof')
    expect(out).toContain('result.nav')
    expect(out).toContain('result.asset_count')
  })
  it('emits Python equivalent with the same field names', () => {
    const out = generateCode('python', fields, { analysisSlug: 'nav_daily' })
    expect(out).toContain('result["asof"]')
    expect(out).toContain('result["nav"]')
  })
  it('emits Rust equivalent', () => {
    const out = generateCode('rust', fields, { analysisSlug: 'nav_daily' })
    expect(out).toContain('asof:')
    expect(out).toContain('nav:')
  })
  it('emits curl with the analysis slug in the URL', () => {
    const out = generateCode('curl', fields, { analysisSlug: 'nav_daily' })
    expect(out).toContain('/analyses/nav_daily/read')
  })
})
