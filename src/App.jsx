import { useMemo, useState } from 'react'
import './App.css'

const DEFAULT_URLS = {
  testops: 'https://testops.katalon.io',
  studio: 'http://127.0.0.1:33699',
  jira: '',
  azureDevOps: '',
}

const PLATFORM_OPTIONS = [
  { id: 'claude', label: 'Claude Desktop' },
  { id: 'vscode', label: 'Visual Studio Code' },
  { id: 'codex', label: 'Codex' },
]

const SERVER_DEFINITIONS = [
  {
    key: 'testops',
    name: 'katalon-testops',
    label: 'Katalon TestOps',
    suffix: '/mcp',
  },
  {
    key: 'studio',
    name: 'katalon-studio-standalone',
    label: 'Katalon Studio',
    suffix: '/mcp/stream',
  },
  {
    key: 'jira',
    name: 'jira',
    label: 'Jira',
    suffix: '/mcp',
  },
  {
    key: 'azureDevOps',
    name: 'azure-devops',
    label: 'Azure DevOps',
    suffix: '/mcp',
  },
]

function normalizeUrl(baseUrl, suffix) {
  const raw = baseUrl.trim()
  if (!raw) return ''

  const hasMcpPath = /\/mcp(\/stream)?\/?$/i.test(raw)
  if (hasMcpPath) return raw

  return `${raw.replace(/\/+$/, '')}${suffix}`
}

function buildServerEntries(urls) {
  const entries = SERVER_DEFINITIONS.flatMap((server) => {
    const normalized = normalizeUrl(urls[server.key], server.suffix)
    if (!normalized) return []

    return [
      [
        server.name,
        {
          type: 'http',
          url: normalized,
        },
      ],
    ]
  })

  return Object.fromEntries(entries)
}

function createPlatformPayload(platform, servers) {
  if (platform === 'vscode') {
    return {
      inputs: [],
      servers,
    }
  }

  if (platform === 'codex') {
    return {
      mcp_servers: servers,
    }
  }

  return {
    mcpServers: servers,
  }
}

function App() {
  const [urls, setUrls] = useState(DEFAULT_URLS)
  const [platform, setPlatform] = useState('claude')
  const [output, setOutput] = useState('')

  const selectedPlatformLabel = useMemo(
    () =>
      PLATFORM_OPTIONS.find((option) => option.id === platform)?.label ||
      'Selected Platform',
    [platform],
  )

  const handleUrlChange = (field) => (event) => {
    setUrls((previous) => ({
      ...previous,
      [field]: event.target.value,
    }))
  }

  const handleGenerate = () => {
    const servers = buildServerEntries(urls)
    const payload = createPlatformPayload(platform, servers)
    setOutput(JSON.stringify(payload, null, 2))
  }

  return (
    <main className="page-shell">
      <section className="generator-card" aria-label="MCP JSON Generator">
        <header className="hero">
          <p className="eyebrow">MCP Helper</p>
          <h1>MCP JSON Builder</h1>
          <p className="subtitle">
            Enter primary server URLs, pick a platform format, and generate an
            MCP JSON config.
          </p>
        </header>

        <div className="grid-layout">
          <section className="panel" aria-labelledby="input-urls-title">
            <h2 id="input-urls-title">1. Primary Server URLs</h2>

            <div className="field-list">
              {SERVER_DEFINITIONS.map((server) => (
                <label key={server.key} className="field">
                  <span>{server.label}</span>
                  <input
                    type="url"
                    placeholder="https://example.com"
                    value={urls[server.key]}
                    onChange={handleUrlChange(server.key)}
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="panel" aria-labelledby="format-title">
            <h2 id="format-title">2. Output MCP JSON Format</h2>
            <div className="radio-group" role="radiogroup" aria-label="Platform">
              {PLATFORM_OPTIONS.map((option) => (
                <label key={option.id} className="radio-option">
                  <input
                    type="radio"
                    name="platform"
                    value={option.id}
                    checked={platform === option.id}
                    onChange={() => setPlatform(option.id)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="panel action-panel" aria-labelledby="generate-title">
            <h2 id="generate-title">3. Generate</h2>
            <button type="button" className="generate-button" onClick={handleGenerate}>
              Generate MCP JSON File
            </button>
            <p className="hint">Selected format: {selectedPlatformLabel}</p>
          </section>

          <section className="panel output-panel" aria-labelledby="output-title">
            <h2 id="output-title">4. Output</h2>
            <pre className="output-box" aria-live="polite">
              {output}
            </pre>
          </section>
        </div>
      </section>
    </main>
  )
}

export default App
