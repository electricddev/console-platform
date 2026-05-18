export type IntegrationLanguage = 'solidity' | 'typescript' | 'python' | 'rust' | 'curl'

export type PayloadField = {
  name: string
  sqlType: string
  abiType: string
  exampleSql: string
  exampleAbi: string
  source: string
}

export type CodegenOpts = {
  analysisSlug: string
  contractAddress?: string
  contractLabel?: string
}

export function generateCode(
  lang: IntegrationLanguage,
  fields: PayloadField[],
  opts: CodegenOpts,
): string {
  switch (lang) {
    case 'solidity': return solidity(fields, opts)
    case 'typescript': return typescriptCode(fields, opts)
    case 'python': return python(fields, opts)
    case 'rust': return rust(fields, opts)
    case 'curl': return curl(fields, opts)
  }
}

export function shikiLang(l: IntegrationLanguage): string {
  if (l === 'solidity') return 'solidity'
  if (l === 'typescript') return 'typescript'
  if (l === 'python') return 'python'
  if (l === 'rust') return 'rust'
  return 'bash'
}

export function buildAbiFragment(fields: PayloadField[]): string {
  return JSON.stringify(
    {
      name: 'onHyveUpdate',
      type: 'function',
      stateMutability: 'view',
      inputs: fields.map((f) => ({ name: f.name, type: f.abiType })),
      outputs: [],
    },
    null,
    2,
  )
}

function solidity(fields: PayloadField[], opts: CodegenOpts): string {
  const abiTypes = fields.map((f) => f.abiType).join(', ')
  const decodeNames = fields.map((f) => f.name).join(', ')
  return `interface IHyveOracle {
  function read(string calldata analysis) external view returns (bytes memory payload, uint64 asOf, bytes memory signature);
}

contract YourVault {
  IHyveOracle constant ORACLE = IHyveOracle(${opts.contractAddress ?? '0x0000000000000000000000000000000000000000'});

  function readPayload() external view {
    (bytes memory payload, uint64 asOf, bytes memory sig) = ORACLE.read("${opts.analysisSlug}");
    require(block.timestamp - asOf < 1 hours, "stale");
    (${decodeNames}) = abi.decode(payload, (${abiTypes}));
  }
}`
}

function typescriptCode(fields: PayloadField[], opts: CodegenOpts): string {
  const reads = fields.map((f) => `console.log(result.${f.name}) // ${f.exampleSql}`).join('\n')
  return `import { HyveClient } from '@hyve/client'

const client = new HyveClient({ orgId: 'org_gauntlet' })
const result = await client.read('${opts.analysisSlug}', { verify: true })

${reads}`
}

function python(fields: PayloadField[], opts: CodegenOpts): string {
  const reads = fields.map((f) => `print(result["${f.name}"])  # ${f.exampleSql}`).join('\n')
  return `from hyve import HyveClient

client = HyveClient(org_id="org_gauntlet")
result = client.read("${opts.analysisSlug}", verify=True)

${reads}`
}

function rust(fields: PayloadField[], opts: CodegenOpts): string {
  const lines = fields.map((f) => `    ${f.name}: ${f.exampleAbi},`).join('\n')
  return `use hyve::HyveClient;

let client = HyveClient::new("org_gauntlet");
let result = client.read("${opts.analysisSlug}").verify().await?;

println!("{:#?}", Payload {
${lines}
});`
}

function curl(_fields: PayloadField[], opts: CodegenOpts): string {
  return `curl -X GET https://api.hyve.app/v1/analyses/${opts.analysisSlug}/read \\
  -H "Authorization: Bearer $HYVE_TOKEN" \\
  -H "Accept: application/json"`
}
