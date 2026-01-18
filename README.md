# grr-gaggiuino-mcp

An MCP (Model Context Protocol) server for [Gaggiuino](https://gaggiuino.github.io/)-modified espresso machines.

Monitor your machine, analyze shots, and manage brewing profiles from any MCP-compatible client.

## Tools

| Tool | Description |
|------|-------------|
| `get_status` | Real-time machine state: temperature, pressure, weight, water level, active profile, brewing/steaming status |
| `get_shot` | Shot data with time-series curves (pressure, flow, temp, weight) and profile used. Defaults to latest shot. |
| `get_profiles` | List all brewing profiles with IDs and selection status |
| `select_profile` | Activate a brewing profile by ID |

## Installation

### Prerequisites

- Node.js 18+
- A Gaggiuino-modified espresso machine on your local network

### Setup

```bash
git clone https://github.com/sgerlach/grr-gaggiuino-mcp.git
cd grr-gaggiuino-mcp
npm install
npm run build
```

### Claude Desktop Configuration

Add to your Claude Desktop config:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "gaggiuino": {
      "command": "node",
      "args": ["/path/to/grr-gaggiuino-mcp/dist/index.js"],
      "env": {
        "GAGGIUINO_BASE_URL": "http://YOUR_GAGGIUINO_IP"
      }
    }
  }
}
```

> **Note**: If using nvm, specify the full path to Node 18+:
> ```json
> "command": "/Users/you/.nvm/versions/node/v20.x.x/bin/node"
> ```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `GAGGIUINO_BASE_URL` | `http://192.168.3.248` | Your Gaggiuino's IP or hostname |
| `REQUEST_TIMEOUT` | `5000` | API timeout in milliseconds |

## Testing

```bash
# With MCP Inspector
npm run inspect

# Direct run
GAGGIUINO_BASE_URL=http://YOUR_IP npm start
```

## Example Usage

```
You: "What's my machine doing?"
→ get_status returns temp, pressure, active profile, etc.

You: "Show me my last shot"
→ get_shot returns full shot data with time-series curves

You: "That shot was sour and thin, what should I change?"
→ Analyzes the shot data and recommends grind/profile adjustments
```

## Unit Conversions

The Gaggiuino API returns values in deci-units. This server converts them to standard units:

| Raw API | Converted |
|---------|-----------|
| deciseconds | seconds |
| decibar | bar |
| decidegrees | °C |
| decigrams | grams |
| deci-ml/s | ml/s |

## API Reference

Based on the [Gaggiuino REST API](https://gaggiuino.github.io/#/rest-api/rest-api).

## License

MIT
