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

### Option 1: npx (easiest)

No install needed - just configure Claude Desktop to use npx:

```json
{
  "mcpServers": {
    "gaggiuino": {
      "command": "npx",
      "args": ["grr-gaggiuino-mcp"],
      "env": {
        "GAGGIUINO_BASE_URL": "http://YOUR_GAGGIUINO_IP"
      }
    }
  }
}
```

### Option 2: Clone and Build

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

## Example Workflows

### Quick Status Check
```
You: "Is my machine ready to pull a shot?"
→ get_status: temp 93°C (target 93°C), pressure stable, water level 85%
```

### Dialing In a New Coffee
```
You: "I have a new bag of coffee - Ethiopian Yirgacheffe, light roast,
      tasting notes of blueberry and citrus. It's 10 days off roast.
      What profile should I start with?"

→ LLM recommends a profile based on the coffee characteristics

You: "OK I pulled the shot, analyze it"
→ get_shot returns pressure/flow/temp curves

You: "It tasted sour and watery"
→ LLM analyzes the shot data against your taste feedback:
   "The pressure ramped too quickly and flow was high (4.2 ml/s).
    Try grinding 2 steps finer. The 6:1 ratio in 24s suggests
    under-extraction - aim for 28-32s."

You: "Pulled another shot after adjusting"
→ get_shot for the new shot
→ "Much better - pressure curve is smoother, 2.8 ml/s flow.
    How did it taste?"
```

### Shot Analysis & Troubleshooting
```
You: "My shots have been channeling lately, look at my last few shots"
→ get_shot (latest), get_shot (id: previous)
→ LLM identifies pressure spikes/instability indicating channeling

You: "Compare this shot to yesterday's good one"
→ Side-by-side analysis of shot curves
```

### Profile Management
```
You: "What profiles do I have?"
→ get_profiles lists all available profiles

You: "Switch to my low-pressure blooming profile"
→ select_profile activates it

You: "Pull a shot and tell me if this profile works for my current beans"
→ get_shot + analysis based on bean characteristics you've shared
```

### Iterative Dial-In Session
```
You: "Let's dial in this coffee. Medium-dark Brazilian, chocolate/nutty,
      for milk drinks. 18g dose, targeting 36g out."

→ LLM suggests starting parameters and profile

[Pull shot 1]
You: "Done, check it"
→ get_shot → "23 seconds, slightly fast. Bitter finish suggests
   over-extraction at the end despite short time - likely channeling.
   Grind 1 step finer and improve puck prep."

[Pull shot 2]
You: "Better prep this time"
→ get_shot → "27 seconds, smooth pressure curve. How's the taste?"

You: "Really good! Balanced, nice chocolate, good body for a cortado"
→ "Great - this is your baseline. Shot data saved.
    Current recipe: 18g → 36g in 27s, Profile: X"
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
