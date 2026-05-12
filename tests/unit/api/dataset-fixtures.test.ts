import { describe, it, expect } from 'vitest'
import { datasetFixtures } from '@/lib/api/fixtures/datasets'
import { DatasetSchema } from '@/lib/api/schemas'

describe('datasetFixtures', () => {
  it('every fixture parses against DatasetSchema', () => {
    datasetFixtures.forEach((d) => expect(() => DatasetSchema.parse(d)).not.toThrow())
  })

  it('includes ds_acred, ds_mfone, ds_jaaa, ds_fasanara, ds_ams_credit', () => {
    const ids = datasetFixtures.map((d) => d.id)
    expect(ids).toEqual(expect.arrayContaining(['ds_acred', 'ds_mfone', 'ds_jaaa', 'ds_fasanara', 'ds_ams_credit']))
  })

  it('every credit-portfolio fixture carries a briefSnapshot', () => {
    const inPortfolio = ['ds_acred', 'ds_mfone', 'ds_jaaa', 'ds_fasanara', 'ds_ams_credit']
    datasetFixtures
      .filter((d) => inPortfolio.includes(d.id))
      .forEach((d) => expect(d.briefSnapshot).toBeDefined())
  })
})
