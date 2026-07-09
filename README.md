# MPC Helper

Web application for generating MCP JSON snippets from primary server URLs and target platform format.

## Features

- URL inputs for:
	- Katalon TestOps (default: `https://testops.katalon.io`)
	- Katalon Studio (default: `http://127.0.0.1:33699`)
	- Jira
	- Azure DevOps
- Radio button output format selection:
	- Claude Desktop
	- Visual Studio Code
	- Codex
- `Generate MCP JSON File` button
- Formatted output box for generated JSON

## Behavior

1. Enter primary server URLs.
2. Select the output format.
3. Click `Generate MCP JSON File`.
4. The app generates MCP JSON text in the output area.

Notes:
- If a URL already ends in `/mcp` or `/mcp/stream`, it is used as-is.
- Otherwise, this app appends a platform-appropriate MCP suffix:
	- TestOps: `/mcp`
	- Studio: `/mcp/stream`
	- Jira: `/mcp`
	- Azure DevOps: `/mcp`

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy to Vercel

1. Push this repository to GitHub.
2. In Vercel, import this project from GitHub.
3. Use default settings:
	 - Framework Preset: `Vite`
	 - Build Command: `npm run build`
	 - Output Directory: `dist`
4. Deploy.
