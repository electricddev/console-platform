import type * as Monaco from 'monaco-editor'

// Monaco editor theme rule type
type MonarchTokenRule = { token: string; foreground?: string; fontStyle?: string }

export function getHqlThemeRules(mode: 'light' | 'vs-dark'): MonarchTokenRule[] {
  if (mode === 'light') {
    return [
      { token: 'keyword', foreground: '1f5f3a' },
      { token: 'keyword.hql', foreground: '1f5f3a' },
      { token: 'privacy', foreground: '0e6a40', fontStyle: 'bold' },
      { token: 'privacy.hql', foreground: '0e6a40', fontStyle: 'bold' },
      { token: 'function.hql', foreground: '1a1a1a' },
      { token: 'string.hql', foreground: '6b6b6b' },
      { token: 'string', foreground: '6b6b6b' },
      { token: 'number.hql', foreground: '1a1a1a' },
      { token: 'number', foreground: '1a1a1a' },
      { token: 'comment', foreground: '9a9a9a', fontStyle: 'italic' },
      { token: 'comment.hql', foreground: '9a9a9a', fontStyle: 'italic' },
    ]
  }
  return [
    { token: 'keyword', foreground: '7fcf9f' },
    { token: 'keyword.hql', foreground: '7fcf9f' },
    { token: 'privacy', foreground: '9be0b1', fontStyle: 'bold' },
    { token: 'privacy.hql', foreground: '9be0b1', fontStyle: 'bold' },
    { token: 'function.hql', foreground: 'e8e8e8' },
    { token: 'string.hql', foreground: 'a8a8a8' },
    { token: 'string', foreground: 'a8a8a8' },
    { token: 'number.hql', foreground: 'e8e8e8' },
    { token: 'number', foreground: 'e8e8e8' },
    { token: 'comment', foreground: '777777', fontStyle: 'italic' },
    { token: 'comment.hql', foreground: '777777', fontStyle: 'italic' },
  ]
}

export function registerHql(monaco: typeof Monaco): void {
  // Register language only once
  const existing = monaco.languages.getLanguages().find((l) => l.id === 'hql')
  if (existing) return

  monaco.languages.register({ id: 'hql' })

  monaco.languages.setMonarchTokensProvider('hql', {
    ignoreCase: true,
    keywords: [
      'select', 'from', 'where', 'group', 'by', 'order', 'having', 'limit',
      'as', 'and', 'or', 'not', 'in', 'between', 'null', 'is', 'case',
      'when', 'then', 'else', 'end', 'with', 'over', 'partition',
      'cohort', 'bucket',
    ],

    privacyPrimitives: [
      'aggregate', 'dp_avg', 'dp_sum', 'dp_count', 'dp_min', 'dp_max',
      'noise', 'epsilon', 'k_anonymity', 'attest',
    ],

    functions: ['avg', 'sum', 'count', 'min', 'max', 'coalesce', 'cast'],

    tokenizer: {
      root: [
        // Block comments
        [/\/\*/, 'comment.hql', '@blockComment'],

        // Line comments (-- style)
        [/--.*$/, 'comment.hql'],

        // Strings (single-quoted)
        [/'/, 'string.hql', '@string'],

        // Numbers
        [/\d+(\.\d+)?([eE][+-]?\d+)?/, 'number.hql'],

        // Identifiers and keywords
        [
          /[a-zA-Z_]\w*/,
          {
            cases: {
              '@privacyPrimitives': 'privacy.hql',
              '@keywords': 'keyword.hql',
              '@functions': 'function.hql',
              '@default': 'identifier',
            },
          },
        ],

        // Whitespace
        { include: '@whitespace' },
      ],

      blockComment: [
        [/[^/*]+/, 'comment.hql'],
        [/\*\//, 'comment.hql', '@pop'],
        [/[/*]/, 'comment.hql'],
      ],

      string: [
        [/[^']+/, 'string.hql'],
        [/''/, 'string.hql'],
        [/'/, 'string.hql', '@pop'],
      ],

      whitespace: [[/[ \t\r\n]+/, 'white']],
    },
  })

  // Register themes
  monaco.editor.defineTheme('hql-light', {
    base: 'vs',
    inherit: false,
    rules: getHqlThemeRules('light'),
    colors: {
      'editor.background': '#00000000',
      'editor.foreground': '#1a1a1a',
      'editorLineNumber.foreground': '#9a9a9a',
      'editorLineNumber.activeForeground': '#1a1a1a',
      'editor.lineHighlightBackground': '#00000008',
      'editorCursor.foreground': '#1a1a1a',
      'editor.selectionBackground': '#1f5f3a22',
      'editorIndentGuide.background1': '#e0e0e0',
    },
  })

  monaco.editor.defineTheme('hql-dark', {
    base: 'vs-dark',
    inherit: false,
    rules: getHqlThemeRules('vs-dark'),
    colors: {
      'editor.background': '#00000000',
      'editor.foreground': '#e8e8e8',
      'editorLineNumber.foreground': '#777777',
      'editorLineNumber.activeForeground': '#e8e8e8',
      'editor.lineHighlightBackground': '#ffffff08',
      'editorCursor.foreground': '#e8e8e8',
      'editor.selectionBackground': '#7fcf9f33',
      'editorIndentGuide.background1': '#333333',
    },
  })
}
