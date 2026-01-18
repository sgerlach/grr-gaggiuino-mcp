# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCP (Model Context Protocol) server for Gaggiuino-modified espresso machines. Provides tools for machine monitoring, shot analysis, and profile management via any MCP-compatible client (e.g., Claude Desktop).

## Commands

```bash
npm run build      # Compile TypeScript to dist/
npm run dev        # Watch mode for development
npm start          # Run the compiled server
npm run inspect    # Test with MCP Inspector
npm run lint       # ESLint on src/
npm run clean      # Remove dist/
```

## Architecture

Single-file MCP server (`src/index.ts`, ~250 lines) with three main components:

1. **GaggiuinoClient** - HTTP client wrapper for the Gaggiuino REST API with timeout handling
2. **Tools array** - MCP tool definitions (get_status, get_shot, get_profiles, select_profile)
3. **Server** - MCP server setup with request handlers for tool listing and execution

The server communicates via stdio transport and connects to a Gaggiuino machine over HTTP.

## Configuration

Environment variables:
- `GAGGIUINO_BASE_URL` - Machine IP/hostname (default: `http://192.168.3.248`)
- `REQUEST_TIMEOUT` - API timeout in ms (default: `5000`)

## Unit Conversions

The Gaggiuino API returns values in deci-units. The client converts:
- deciseconds → seconds
- decibar → bar
- decidegrees → °C
- decigrams → grams
- deci-ml/s → ml/s

## Dependencies

- `@modelcontextprotocol/sdk` - MCP protocol implementation
- Node.js 18+ (uses native fetch)
