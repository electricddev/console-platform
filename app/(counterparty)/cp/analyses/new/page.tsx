import { AnalysisWorkbench } from '@/components/v2/features/cp/analysis-workbench'
import { analyses } from '@/components/v2/features/cp/cp-fixtures'

/**
 * /cp/analyses/new — Analysis authoring workbench.
 *
 * RSC wrapper: reads search params, resolves source analysis for version-bump
 * flows, and passes resolved props to the client workbench component.
 *
 * Search params:
 *   ?vault=<id>         — pre-select vault, skip picker dialog
 *   ?from=<analysisId>  — propose a new version of an existing analysis
 *   ?version=<N>        — the proposed version number (used with ?from)
 */
export default async function NewAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const vaultParam = sp['vault'] ?? null
  const fromParam = sp['from'] ?? null
  const versionParam = sp['version'] ? parseInt(sp['version'], 10) : null

  // Validate fromParam against known analyses
  const sourceExists = fromParam
    ? analyses.some((a) => a.id === fromParam)
    : false

  return (
    <AnalysisWorkbench
      initialVaultId={vaultParam}
      fromAnalysisId={sourceExists ? fromParam : null}
      fromVersion={sourceExists && versionParam ? versionParam : null}
    />
  )
}
