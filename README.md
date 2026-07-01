# mcp-csv

CSV <-> JSON MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1148+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `csv_to_json` | Parse RFC 4180 CSV into JSON (keyless, offline). With `header` true (default) the first row becomes object keys; otherwise rows are returned as arrays. Handles quoted fields, escaped quotes, and embedded commas/newlines. Set `delimiter` for TSV etc. |
| `json_to_csv` | Serialize an array of JSON objects (or arrays) to CSV (keyless, offline). Object keys become the header (union of all keys, in first-seen order). Fields are quoted when needed. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "csv": {
      "url": "https://gateway.pipeworx.io/csv/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1148+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Csv data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [All tools and guides](https://github.com/pipeworx-io/examples)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
