#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

const GAGGIUINO_BASE_URL = process.env.GAGGIUINO_BASE_URL || "http://192.168.3.248";
const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || "5000", 10);

// ============================================================================
// API Client - matches official Gaggiuino REST API
// https://gaggiuino.github.io/#/rest-api/rest-api
// ============================================================================

class GaggiuinoClient {
  constructor(private baseUrl: string, private timeout: number) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  private async fetch(endpoint: string, options?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return res;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // GET /api/system/status - system sensors latest data
  async getSystemStatus() {
    const res = await this.fetch("/api/system/status");
    const raw = await res.json();
    if (!Array.isArray(raw) || raw.length === 0) {
      throw new Error("Invalid API response: expected non-empty array from /api/system/status");
    }
    const s = raw[0];
    if (!s || typeof s !== "object") {
      throw new Error("Invalid API response: missing status data");
    }
    return {
      brewing: s.brewSwitchState === "true",
      steaming: s.steamSwitchState === "true",
      profile: { id: parseInt(s.profileId), name: s.profileName },
      temperature: { current: parseFloat(s.temperature), target: parseFloat(s.targetTemperature) },
      pressure: parseFloat(s.pressure),
      weight: parseFloat(s.weight),
      waterLevel: parseInt(s.waterLevel),
    };
  }

  // GET /api/shots/latest - latest shot identifier
  async getLatestShotId(): Promise<number> {
    const res = await this.fetch("/api/shots/latest");
    const raw = await res.json();
    if (!Array.isArray(raw) || raw.length === 0 || !raw[0]?.lastShotId) {
      throw new Error("Invalid API response: expected array with lastShotId from /api/shots/latest");
    }
    return parseInt(raw[0].lastShotId);
  }

  // GET /api/shots/{id} - shot data
  async getShot(id: number) {
    const res = await this.fetch(`/api/shots/${id}`);
    const raw = await res.json() as any;
    if (!raw || typeof raw !== "object") {
      throw new Error(`Invalid API response: expected object from /api/shots/${id}`);
    }
    const dp = raw.datapoints;
    if (!dp || typeof dp !== "object") {
      throw new Error(`Invalid shot data: missing datapoints for shot ${id}`);
    }
    
    // Convert from deci-units to standard units
    return {
      id: raw.id,
      timestamp: new Date(raw.timestamp * 1000).toISOString(),
      durationSeconds: raw.duration / 10,
      profile: raw.profile ? {
        id: raw.profile.id,
        name: raw.profile.name,
        temperatureC: raw.profile.waterTemperature,
        stopConditions: raw.profile.globalStopConditions ? {
          weightG: raw.profile.globalStopConditions.weight,
          timeSeconds: raw.profile.globalStopConditions.time ? raw.profile.globalStopConditions.time / 1000 : null,
        } : null,
        phases: raw.profile.phases?.map((p: any) => ({
          name: p.name,
          type: p.type,
          target: { start: p.target.start, end: p.target.end, curve: p.target.curve },
          durationSeconds: p.stopConditions?.time ? p.stopConditions.time / 1000 : null,
          flowRestriction: p.restriction,
        })),
      } : null,
      datapoints: {
        timeSeconds: dp.timeInShot.map((t: number) => t / 10),
        pressureBar: dp.pressure.map((p: number) => p / 10),
        flowMlPerSec: dp.pumpFlow.map((f: number) => f / 10),
        weightFlowGPerSec: dp.weightFlow.map((f: number) => f / 10),
        temperatureC: dp.temperature.map((t: number) => t / 10),
        weightG: dp.shotWeight.map((w: number) => w / 10),
        waterPumpedMl: dp.waterPumped.map((w: number) => w / 10),
        targets: {
          temperatureC: dp.targetTemperature.map((t: number) => t / 10),
          flowMlPerSec: dp.targetPumpFlow.map((f: number) => f / 10),
          pressureBar: dp.targetPressure.map((p: number) => p / 10),
        },
      },
    };
  }

  // GET /api/profiles/all - all profiles
  async getProfiles() {
    const res = await this.fetch("/api/profiles/all");
    const raw = await res.json();
    if (!Array.isArray(raw)) {
      throw new Error("Invalid API response: expected array from /api/profiles/all");
    }
    return raw.map(p => ({
      id: p.id,
      name: p.name,
      selected: p.selected === "true",
    }));
  }

  // POST /api/profile-select/{id} - select profile
  async selectProfile(id: number) {
    await this.fetch(`/api/profile-select/${id}`, { method: "POST" });
  }
}

const client = new GaggiuinoClient(GAGGIUINO_BASE_URL, REQUEST_TIMEOUT);

// ============================================================================
// MCP Tools
// ============================================================================

const tools: Tool[] = [
  {
    name: "get_status",
    description: "Get real-time Gaggiuino espresso machine status including: current/target temperature (Celsius), pressure (bar), scale weight (grams), water tank level (%), whether brewing or steaming is active, and the currently selected profile name and ID.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_shot",
    description: "Retrieve detailed shot data with time-series curves for analysis. Returns pressure (bar), flow rate (ml/s), temperature (C), weight (g), and target values over time. Includes the profile used and shot duration. Omit ID to get the most recent shot.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "Shot ID for historical data. Omit to get the latest shot." },
      },
    },
  },
  {
    name: "get_profiles",
    description: "List all available brewing profiles stored on the Gaggiuino. Returns profile IDs, names, and which one is currently selected. Use this to see available profiles before selecting one.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "select_profile",
    description: "Activate a brewing profile by its ID. The machine will use this profile for the next shot. Get available profile IDs using get_profiles first.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "Profile ID to activate" },
      },
      required: ["id"],
    },
  },
];

// ============================================================================
// Server
// ============================================================================

const server = new Server(
  { name: "grr-gaggiuino-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "get_status": {
        const status = await client.getSystemStatus();
        return { content: [{ type: "text", text: JSON.stringify(status, null, 2) }] };
      }

      case "get_shot": {
        let id: number;
        if (args?.id !== undefined) {
          if (typeof args.id !== "number" || !Number.isInteger(args.id) || args.id <= 0) {
            throw new Error("Shot ID must be a positive integer");
          }
          id = args.id;
        } else {
          id = await client.getLatestShotId();
        }
        const shot = await client.getShot(id);
        return { content: [{ type: "text", text: JSON.stringify(shot, null, 2) }] };
      }

      case "get_profiles": {
        const profiles = await client.getProfiles();
        return { content: [{ type: "text", text: JSON.stringify(profiles, null, 2) }] };
      }

      case "select_profile": {
        if (typeof args?.id !== "number" || !Number.isInteger(args.id)) {
          throw new Error("Profile ID must be an integer");
        }
        await client.selectProfile(args.id);
        return { content: [{ type: "text", text: `Profile ${args.id} selected` }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`grr-gaggiuino-mcp running (${GAGGIUINO_BASE_URL})`);
}

main().catch(e => { console.error(e); process.exit(1); });
