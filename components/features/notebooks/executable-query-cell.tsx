'use client'

import { useCellQuery } from '@/lib/data/use-cell-query'
import { ResultRenderer } from '@/components/features/compose/result-renderer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { acredMethodology } from '@/lib/data/acred/methodology'
import type { RenderShape } from '@/lib/data/methodology'

type Props = {
  dsl: string
  methodologyId?: string
  renderShape?: RenderShape
}

export function ExecutableQueryCell({ dsl, methodologyId, renderShape }: Props) {
  const m = methodologyId ? acredMethodology.find((x) => x.id === methodologyId) : undefined
  const shape: RenderShape = renderShape ?? m?.shape ?? 'table'
  const state = useCellQuery(dsl)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{m?.title ?? 'Query'}</CardTitle>
        {m?.description && <p className="text-xs text-muted-foreground">{m.description}</p>}
      </CardHeader>
      <CardContent>
        {state.error && <p className="text-xs text-destructive">Error: {state.error.message}</p>}
        {!state.error && !state.ready && <p className="text-xs text-muted-foreground">Running…</p>}
        {state.ready && <ResultRenderer result={state.result} shape={shape} />}
      </CardContent>
    </Card>
  )
}
