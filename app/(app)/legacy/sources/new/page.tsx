import { PageHeader } from '@/components/common/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createSource } from './actions'

const SOURCE_TYPES = [
  { value: 'postgres', label: 'PostgreSQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'snowflake', label: 'Snowflake' },
  { value: 'bigquery', label: 'BigQuery' },
  { value: 's3', label: 'Amazon S3' },
  { value: 'rest-api', label: 'REST API' },
  { value: 'custom', label: 'Custom' },
] as const

const INSTALL_COMMANDS = `# Download and install the Verant agent
curl -sSL https://install.verant.io/agent | sh

# Configure with your organisation token
verant-agent configure --token <YOUR_ORG_TOKEN>

# Connect this source (replace <SOURCE_ID> after saving)
verant-agent source connect \\
  --id <SOURCE_ID> \\
  --type <SOURCE_TYPE> \\
  --connection-string "<CONNECTION_STRING>"

# Start ingestion
verant-agent source start <SOURCE_ID>`

export default function NewSourcePage() {
  return (
    <div className="px-6 py-6 max-w-2xl mx-auto">
      <PageHeader
        eyebrow="// sources · new"
        title="Connect a source"
        description="Add a new data source to your organisation. After saving, follow the agent install instructions."
      />

      <form action={createSource} className="mt-6 grid gap-4">
        {/* Step 1: Source type */}
        <Card>
          <CardHeader>
            <CardTitle>1. Source type</CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="type" className="mb-2 block">
              Database / storage type
            </Label>
            <Select name="type" defaultValue="postgres" required>
              <SelectTrigger id="type" className="w-full">
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_TYPES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Step 2: Source name */}
        <Card>
          <CardHeader>
            <CardTitle>2. Source name</CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="name" className="mb-2 block">
              Display name
            </Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g. mF-ONE Postgres"
              required
              minLength={2}
              maxLength={80}
            />
          </CardContent>
        </Card>

        {/* Step 3: Agent install instructions */}
        <Card>
          <CardHeader>
            <CardTitle>3. Install the Verant agent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              Run these commands on the server that hosts your data source. The agent streams
              ingestion events to Verant without copying raw rows.
            </p>
            <pre className="overflow-x-auto rounded-lg border border-border bg-muted/50 p-4 font-mono text-xs leading-relaxed text-foreground/80">
              {INSTALL_COMMANDS}
            </pre>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit">Save and continue</Button>
        </div>
      </form>
    </div>
  )
}
