import { useMemo, useState } from 'react'
import './App.css'

const DEFAULT_URLS = {
  testops: 'https://testops.katalon.io',
  studio: 'http://127.0.0.1:33699',
  jira: '',
  azureDevOps: '',
}

const PLATFORM_OPTIONS = [
  { id: 'claude', label: 'Claude Desktop', targetFile: 'claude_desktop_config.json' },
  { id: 'vscode', label: 'Visual Studio Code', targetFile: '.vscode/mcp.json' },
  { id: 'codex', label: 'Codex', targetFile: '~/.codex/config.toml' },
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

function buildServerEntries(urls, platform) {
  const entries = SERVER_DEFINITIONS.flatMap((server) => {
    const normalized = normalizeUrl(urls[server.key], server.suffix)
    if (!normalized) return []

    // Claude Desktop's claude_desktop_config.json does not support
    // "type": "http" / "url" entries — it only supports stdio servers.
    // Bridge remote HTTP servers through mcp-remote instead.
    const definition =
      platform === 'claude'
        ? {
            command: 'npx',
            args: ['mcp-remote', normalized],
          }
        : {
            type: 'http',
            url: normalized,
          }

    return [[server.name, definition]]
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

  return {
    mcpServers: servers,
  }
}

// Codex does not use JSON configuration. Its MCP servers are declared as
// TOML tables in ~/.codex/config.toml, one [mcp_servers.<name>] block per
// server, e.g.:
//
//   [mcp_servers.jira]
//   url = "https://example.atlassian.net/mcp"
//
// so Codex output must be generated as TOML text rather than run through
// createPlatformPayload/JSON.stringify like the other platforms.
function escapeTomlString(value) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function buildCodexToml(urls) {
  const blocks = SERVER_DEFINITIONS.flatMap((server) => {
    const normalized = normalizeUrl(urls[server.key], server.suffix)
    if (!normalized) return []

    return [`[mcp_servers.${server.name}]\nurl = "${escapeTomlString(normalized)}"`]
  })

  return blocks.join('\n\n')
}

function App() {
  const [urls, setUrls] = useState(DEFAULT_URLS)
  const [platform, setPlatform] = useState('claude')
  const [output, setOutput] = useState('')

  const selectedPlatform = useMemo(
    () => PLATFORM_OPTIONS.find((option) => option.id === platform),
    [platform],
  )

  const handleUrlChange = (field) => (event) => {
    setUrls((previous) => ({
      ...previous,
      [field]: event.target.value,
    }))
  }

  const handleGenerate = () => {
    if (platform === 'codex') {
      setOutput(buildCodexToml(urls))
      return
    }

    const servers = buildServerEntries(urls, platform)
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
            MCP config.
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
            <h2 id="format-title">2. Output MCP Config Format</h2>
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
              Generate MCP Config File
            </button>
            <p className="hint">
              Selected format: {selectedPlatform?.label} ({selectedPlatform?.targetFile})
            </p>
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
