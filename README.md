# trim-dev-tools-mcp

Developer utility tools for AI agents, via the [Model Context Protocol](https://modelcontextprotocol.io).

13 tools that AI coding agents actually need during development tasks.

## Tools

| Tool | Description |
|------|-------------|
| `json_format` | Format, minify, or validate JSON |
| `base64` | Encode or decode Base64 |
| `hash` | MD5, SHA-1, SHA-256, SHA-512 hashing |
| `uuid` | Generate UUIDs (v4), single or batch |
| `url_encode` | URL encode/decode strings |
| `regex_test` | Test patterns with match positions and groups |
| `epoch` | Convert timestamps, get current time |
| `color_convert` | Convert between HEX, RGB, HSL |
| `password` | Generate cryptographically secure passwords |
| `jwt_decode` | Decode JWT tokens (header + payload) |
| `word_count` | Words, chars, sentences, reading time |
| `cron_parse` | Parse cron expressions to plain English |
| `lorem_ipsum` | Generate placeholder text |

## Install

```bash
npm install -g trim-dev-tools-mcp
```

## Configure

### Claude Desktop

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "trim-dev-tools": {
      "command": "npx",
      "args": ["-y", "trim-dev-tools-mcp"]
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "trim-dev-tools": {
      "command": "npx",
      "args": ["-y", "trim-dev-tools-mcp"]
    }
  }
}
```

### OpenClaw / Other Agents

Any MCP-compatible agent can connect via stdio transport:

```bash
npx trim-dev-tools-mcp
```

## Examples

An AI agent can call these tools directly:

```
> json_format({ input: '{"name":"trim","v":1}', action: "format", indent: 2 })

{
  "name": "trim",
  "v": 1
}
```

```
> hash({ input: "hello world", algorithm: "sha256" })

b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9
```

```
> regex_test({ pattern: "\\d{3}-\\d{4}", flags: "g", input: "Call 555-1234 or 555-5678" })

{
  "matchCount": 2,
  "matches": [
    { "match": "555-1234", "index": 5 },
    { "match": "555-5678", "index": 17 }
  ]
}
```

## Built by

[Trim](https://trimtools.dev) -- free developer tools that run in your browser.

## License

MIT
