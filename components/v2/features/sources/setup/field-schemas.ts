import { z } from 'zod'

export type FieldHint = {
  key: string
  label: string
  type: 'text' | 'password' | 'select'
  placeholder?: string
  options?: readonly string[]
  helper?: string
}

export type ConnectorAuthSchema = {
  schema: z.ZodTypeAny
  fields: readonly FieldHint[]
}

export const S3_AUTH_SCHEMA: ConnectorAuthSchema = {
  schema: z.object({
    bucket: z.string().min(2),
    region: z.string().min(2),
    accessKeyId: z.string().min(8),
    secretAccessKey: z.string().min(8),
    prefix: z.string().optional(),
  }),
  fields: [
    { key: 'bucket', label: 'Bucket', type: 'text', placeholder: 'acred-archive' },
    { key: 'region', label: 'Region', type: 'select', options: ['us-east-1', 'us-east-2', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-southeast-2'] },
    { key: 'accessKeyId', label: 'Access key ID', type: 'text', placeholder: 'AKIA…' },
    { key: 'secretAccessKey', label: 'Secret access key', type: 'password' },
    { key: 'prefix', label: 'Prefix (optional)', type: 'text', placeholder: 'production/borrower-packets/', helper: 'Restrict ingestion to this prefix.' },
  ],
}

export const FILE_UPLOAD_AUTH_SCHEMA: ConnectorAuthSchema = {
  schema: z.object({
    label: z.string().min(2).max(60),
    format: z.enum(['csv', 'parquet', 'json']),
  }),
  fields: [
    { key: 'label', label: 'Dataset label', type: 'text', placeholder: 'q3-borrower-packets', helper: 'A human name for this drop.' },
    { key: 'format', label: 'File format', type: 'select', options: ['csv', 'parquet', 'json'] },
  ],
}

export const SEC_EDGAR_AUTH_SCHEMA: ConnectorAuthSchema = {
  schema: z.object({}),
  fields: [],
}

export function authSchemaFor(connectorId: string): ConnectorAuthSchema | null {
  switch (connectorId) {
    case 's3': return S3_AUTH_SCHEMA
    case 'file-upload': return FILE_UPLOAD_AUTH_SCHEMA
    case 'sec-edgar': return SEC_EDGAR_AUTH_SCHEMA
    default: return null
  }
}
