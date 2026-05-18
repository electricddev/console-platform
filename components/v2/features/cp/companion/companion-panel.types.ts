import type { ConsumerVault } from '@/components/v2/features/cp/cp-fixtures'
import type {
  FieldRef,
  Destination,
  TriggerKind,
  OnchainDest,
} from '@/components/v2/features/cp/analysis-workbench'

export type CompanionTab =
  | 'validate'
  | 'dryrun'
  | 'tests'
  | 'schedule'
  | 'integration'
  | 'terminal'

export type TerminalMode = 'bridge' | 'assistant' | 'cli'

export type CompanionPanelProps = {
  open: boolean
  onToggle: () => void
  activeTab: CompanionTab
  onTabChange: (t: CompanionTab) => void
  code: string
  vault: ConsumerVault | null
  fieldRefs: FieldRef[]
  destinations: Destination[]
  name: string
  triggerKind: TriggerKind
  cronExpr: string
  eventSource: string
}

export type CompanionContextValue = {
  code: string
  vault: ConsumerVault | null
  fieldRefs: FieldRef[]
  destinations: Destination[]
  name: string
  triggerKind: TriggerKind
  cronExpr: string
  eventSource: string
  onchainDests: OnchainDest[]
}
