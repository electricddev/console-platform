import { marked } from 'marked'

export function CellMarkdown({ markdown }: { markdown: string }) {
  const html = marked.parse(markdown, { async: false }) as string
  return <article className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
}
