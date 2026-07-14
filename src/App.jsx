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

// Detects whether a URL's *path* (not its query string or fragment) already
// ends in /mcp or /mcp/stream, and appends the suffix into the path rather
// than onto the raw string. Using the URL API avoids a prior bug where a
// URL like ".../mcp?token=abc" was not recognized as already-suffixed
// (the check anchored on the end of the whole string) and got a second
// "/mcp" appended after the query string.
function normalizeUrl(baseUrl, suffix) {
  const raw = baseUrl.trim()
  if (!raw) return ''

  let parsed
  try {
    parsed = new URL(raw)
  } catch {
    // Not a fully-qualified URL (e.g. missing protocol) — fall back to
    // simple trailing-slash + suffix handling on the raw string.
    if (/\/mcp(\/stream)?\/?$/i.test(raw)) return raw
    return `${raw.replace(/\/+$/, '')}${suffix}`
  }

  const hasMcpPath = /\/mcp(\/stream)?\/?$/i.test(parsed.pathname)
  if (hasMcpPath) return raw

  parsed.pathname = `${parsed.pathname.replace(/\/+$/, '')}${suffix}`
  return parsed.toString()
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

const INSTALLATION_INSTRUCTIONS = {
  claude: {
    intro:
      'Claude Desktop stores its MCP server configuration in claude_desktop_config.json. How you get to that file depends on which Claude Desktop version you have installed.',
    methods: [
      {
        title: 'Newer versions — Settings → Developer (recommended)',
        note: 'Use this method if your Claude Desktop has a "Developer" tab under Settings. This has been the standard method since mid-2025 releases.',
        steps: [
          'Open the Claude menu from your system menu bar (macOS) or the app window (Windows) — not the in-chat settings — and choose "Settings…".',
          'Select the "Developer" tab in the left sidebar.',
          'Click "Edit Config". This opens claude_desktop_config.json in your default text editor, creating the file if it does not already exist.',
          'Paste in the config segment shown above. If the file already has an "mcpServers" object, merge the new server entry into it rather than replacing the whole file.',
          'Save the file, then fully quit Claude Desktop (not just close the window) and reopen it.',
          'Look for the MCP/tools indicator in the message input area to confirm the server connected.',
        ],
      },
      {
        title: 'Older versions — manual file edit',
        note: 'Use this method if your Settings screen has no "Developer" tab. Locate and edit the config file directly with a text editor.',
        steps: [
          'Close Claude Desktop.',
          'Open the config file in a text editor, creating the folder/file if needed:',
          'macOS: ~/Library/Application Support/Claude/claude_desktop_config.json',
          'Windows: %APPDATA%\\Claude\\claude_desktop_config.json',
          'If the file is empty or new, start with { "mcpServers": {} }.',
          'Paste in the config segment shown above, merging it into the existing "mcpServers" object if one is already present.',
          'Save the file and reopen Claude Desktop.',
        ],
      },
    ],
  },
  vscode: {
    intro:
      'VS Code reads MCP server definitions from a workspace-level mcp.json file.',
    steps: [
      'In your project root, create a .vscode folder if one does not already exist.',
      'Inside it, create or open .vscode/mcp.json.',
      'Paste in the config segment shown above. If the file already has a "servers" object, merge the new entry into it rather than replacing the whole file.',
      'Save the file. VS Code will detect the new MCP server automatically (or use the "MCP: List Servers" command from the Command Palette to start it manually).',
      'Confirm the server appears and connects via the MCP status indicator in the Command Palette or the Copilot Chat view.',
    ],
  },
  codex: {
    intro:
      'Codex reads MCP servers as TOML tables from a global config file rather than JSON.',
    steps: [
      'Open (or create) ~/.codex/config.toml in a text editor.',
      'Paste in the TOML block(s) shown above, appending them to the file rather than replacing any existing content.',
      'Save the file.',
      'Restart Codex, or start a new session, so it picks up the updated configuration.',
      'Run a Codex command that lists configured MCP servers to confirm the new server is recognized.',
    ],
  },
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

          <section className="panel installation-panel" aria-labelledby="installation-title">
            <h2 id="installation-title">5. Installation Instructions</h2>
            <p className="hint">
              How to add the {selectedPlatform?.label} config segment above to{' '}
              {selectedPlatform?.targetFile}.
            </p>

            {platform === 'claude' ? (
              <>
                <p className="install-intro">{INSTALLATION_INSTRUCTIONS.claude.intro}</p>
                {INSTALLATION_INSTRUCTIONS.claude.methods.map((method) => (
                  <div className="install-method" key={method.title}>
                    <h3>{method.title}</h3>
                    <p className="install-note">{method.note}</p>
                    <ol>
                      {method.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                ))}
              </>
            ) : (
              <div className="install-method">
                <p className="install-intro">{INSTALLATION_INSTRUCTIONS[platform].intro}</p>
                <ol>
                  {INSTALLATION_INSTRUCTIONS[platform].steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  )
}

export default App
