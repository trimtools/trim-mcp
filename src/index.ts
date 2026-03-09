#!/usr/bin/env node

/**
 * Trim Developer Tools MCP Server
 *
 * Provides developer utility tools to AI agents via the Model Context Protocol.
 * JSON formatting, base64 encoding/decoding, hashing, UUID generation,
 * regex testing, URL encoding/decoding, epoch conversion, and more.
 *
 * https://trimtools.dev
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import crypto from "node:crypto";

const server = new McpServer({
  name: "trim-dev-tools",
  version: "1.0.0",
});


// ================================================================
// TOOL: json_format
// ================================================================
server.tool(
  "json_format",
  "Format, validate, or minify a JSON string. Returns formatted output or validation errors.",
  {
    input: z.string().describe("The JSON string to process"),
    action: z.enum(["format", "minify", "validate"]).default("format").describe("Action to perform"),
    indent: z.number().min(1).max(8).default(2).describe("Indentation spaces (for format action)"),
  },
  async ({ input, action, indent }) => {
    try {
      const parsed = JSON.parse(input);
      if (action === "validate") {
        return { content: [{ type: "text", text: JSON.stringify({ valid: true, type: Array.isArray(parsed) ? "array" : typeof parsed, keys: typeof parsed === "object" && parsed !== null ? Object.keys(parsed).length : null }) }] };
      }
      const result = action === "minify" ? JSON.stringify(parsed) : JSON.stringify(parsed, null, indent);
      return { content: [{ type: "text", text: result }] };
    } catch (e: any) {
      return { content: [{ type: "text", text: JSON.stringify({ valid: false, error: e.message }) }] };
    }
  }
);


// ================================================================
// TOOL: base64
// ================================================================
server.tool(
  "base64",
  "Encode or decode a Base64 string.",
  {
    input: z.string().describe("The string to encode or decode"),
    action: z.enum(["encode", "decode"]).default("encode").describe("Encode to Base64 or decode from Base64"),
  },
  async ({ input, action }) => {
    try {
      const result = action === "encode"
        ? Buffer.from(input, "utf-8").toString("base64")
        : Buffer.from(input, "base64").toString("utf-8");
      return { content: [{ type: "text", text: result }] };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
    }
  }
);


// ================================================================
// TOOL: hash
// ================================================================
server.tool(
  "hash",
  "Generate a hash of the input string. Supports MD5, SHA-1, SHA-256, SHA-512.",
  {
    input: z.string().describe("The string to hash"),
    algorithm: z.enum(["md5", "sha1", "sha256", "sha512"]).default("sha256").describe("Hash algorithm"),
  },
  async ({ input, algorithm }) => {
    const hash = crypto.createHash(algorithm).update(input).digest("hex");
    return { content: [{ type: "text", text: hash }] };
  }
);


// ================================================================
// TOOL: uuid
// ================================================================
server.tool(
  "uuid",
  "Generate one or more UUIDs (v4).",
  {
    count: z.number().min(1).max(100).default(1).describe("Number of UUIDs to generate"),
  },
  async ({ count }) => {
    const uuids = Array.from({ length: count }, () => crypto.randomUUID());
    return { content: [{ type: "text", text: count === 1 ? uuids[0] : uuids.join("\n") }] };
  }
);


// ================================================================
// TOOL: url_encode
// ================================================================
server.tool(
  "url_encode",
  "URL-encode or decode a string. Uses encodeURIComponent / decodeURIComponent.",
  {
    input: z.string().describe("The string to encode or decode"),
    action: z.enum(["encode", "decode"]).default("encode").describe("Encode or decode"),
  },
  async ({ input, action }) => {
    try {
      const result = action === "encode" ? encodeURIComponent(input) : decodeURIComponent(input);
      return { content: [{ type: "text", text: result }] };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
    }
  }
);


// ================================================================
// TOOL: regex_test
// ================================================================
server.tool(
  "regex_test",
  "Test a regex pattern against a string. Returns all matches with positions.",
  {
    pattern: z.string().describe("The regex pattern (without delimiters)"),
    flags: z.string().default("g").describe("Regex flags (e.g. 'gi' for global + case insensitive)"),
    input: z.string().describe("The test string to match against"),
  },
  async ({ pattern, flags, input }) => {
    try {
      const re = new RegExp(pattern, flags);
      const matches = [];
      let m;
      if (flags.includes("g")) {
        while ((m = re.exec(input)) !== null) {
          matches.push({ match: m[0], index: m.index, groups: m.slice(1) });
        }
      } else {
        m = re.exec(input);
        if (m) matches.push({ match: m[0], index: m.index, groups: m.slice(1) });
      }
      return { content: [{ type: "text", text: JSON.stringify({ pattern, flags, matchCount: matches.length, matches }, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Regex error: ${e.message}` }], isError: true };
    }
  }
);


// ================================================================
// TOOL: epoch
// ================================================================
server.tool(
  "epoch",
  "Convert between Unix timestamps and human-readable dates. Also returns the current timestamp.",
  {
    action: z.enum(["to_date", "to_epoch", "now"]).default("now").describe("Conversion direction or get current time"),
    value: z.string().optional().describe("Unix timestamp (seconds or ms) for to_date, or ISO date string for to_epoch"),
  },
  async ({ action, value }) => {
    if (action === "now") {
      const now = new Date();
      return { content: [{ type: "text", text: JSON.stringify({ epoch_seconds: Math.floor(now.getTime() / 1000), epoch_ms: now.getTime(), iso: now.toISOString(), utc: now.toUTCString() }) }] };
    }
    if (!value) return { content: [{ type: "text", text: "Error: value is required for to_date and to_epoch" }], isError: true };

    if (action === "to_date") {
      const num = parseInt(value, 10);
      const ms = num > 1e12 ? num : num * 1000; // auto-detect seconds vs ms
      const d = new Date(ms);
      return { content: [{ type: "text", text: JSON.stringify({ epoch_seconds: Math.floor(ms / 1000), epoch_ms: ms, iso: d.toISOString(), utc: d.toUTCString() }) }] };
    }

    // to_epoch
    const d = new Date(value);
    if (isNaN(d.getTime())) return { content: [{ type: "text", text: `Error: could not parse date "${value}"` }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify({ epoch_seconds: Math.floor(d.getTime() / 1000), epoch_ms: d.getTime(), iso: d.toISOString() }) }] };
  }
);


// ================================================================
// TOOL: color_convert
// ================================================================
server.tool(
  "color_convert",
  "Convert colors between HEX, RGB, and HSL formats.",
  {
    color: z.string().describe("Color value (e.g. '#ff5733', 'rgb(255,87,51)', 'hsl(11,100%,60%)')"),
  },
  async ({ color }) => {
    let r: number | undefined, g: number | undefined, b: number | undefined;
    const s = color.trim().toLowerCase();

    // Parse HEX
    const hexMatch = s.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/);
    if (hexMatch) {
      let hex = hexMatch[1];
      if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
      r = parseInt(hex.slice(0,2), 16);
      g = parseInt(hex.slice(2,4), 16);
      b = parseInt(hex.slice(4,6), 16);
    }
    // Parse RGB
    const rgbMatch = s.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
    if (rgbMatch) { r = +rgbMatch[1]; g = +rgbMatch[2]; b = +rgbMatch[3]; }

    // Parse HSL
    const hslMatch = s.match(/^hsl\s*\(\s*(\d+)\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*\)$/);
    if (hslMatch) {
      const h = +hslMatch[1] / 360, sat = +hslMatch[2] / 100, l = +hslMatch[3] / 100;
      if (sat === 0) { r = g = b = Math.round(l * 255); }
      else {
        const hue2rgb = (p: number, q: number, t: number): number => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1/6) return p + (q-p)*6*t; if (t < 1/2) return q; if (t < 2/3) return p + (q-p)*(2/3-t)*6; return p; };
        const q = l < 0.5 ? l * (1 + sat) : l + sat - l * sat;
        const p = 2 * l - q;
        r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
        g = Math.round(hue2rgb(p, q, h) * 255);
        b = Math.round(hue2rgb(p, q, h - 1/3) * 255);
      }
    }

    if (r === undefined) return { content: [{ type: "text", text: `Could not parse color: "${color}". Use hex (#ff5733), rgb(255,87,51), or hsl(11,100%,60%).` }], isError: true };

    // Convert to all formats
    const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    const rgb = `rgb(${r}, ${g}, ${b})`;
    const max = Math.max(r,g,b)/255, min = Math.min(r,g,b)/255;
    const l = (max+min)/2;
    let h = 0, sat = 0;
    if (max !== min) {
      const d = max - min;
      sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r/255) h = ((g/255 - b/255) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g/255) h = ((b/255 - r/255) / d + 2) / 6;
      else h = ((r/255 - g/255) / d + 4) / 6;
    }
    const hsl = `hsl(${Math.round(h*360)}, ${Math.round(sat*100)}%, ${Math.round(l*100)}%)`;

    return { content: [{ type: "text", text: JSON.stringify({ hex, rgb, hsl, r, g, b }) }] };
  }
);


// ================================================================
// TOOL: password
// ================================================================
server.tool(
  "password",
  "Generate a cryptographically secure random password.",
  {
    length: z.number().min(4).max(128).default(16).describe("Password length"),
    uppercase: z.boolean().default(true).describe("Include uppercase letters"),
    lowercase: z.boolean().default(true).describe("Include lowercase letters"),
    digits: z.boolean().default(true).describe("Include digits"),
    symbols: z.boolean().default(true).describe("Include symbols (!@#$%^&*...)"),
    count: z.number().min(1).max(20).default(1).describe("Number of passwords to generate"),
  },
  async ({ length, uppercase, lowercase, digits, symbols, count }) => {
    let charset = "";
    if (lowercase) charset += "abcdefghijklmnopqrstuvwxyz";
    if (uppercase) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (digits) charset += "0123456789";
    if (symbols) charset += "!@#$%^&*()-_=+[]{}|;:,.<>?";
    if (!charset) charset = "abcdefghijklmnopqrstuvwxyz0123456789";

    const generate = () => {
      const bytes = crypto.randomBytes(length);
      return Array.from(bytes).map(b => charset[b % charset.length]).join("");
    };

    const passwords = Array.from({ length: count }, generate);
    return { content: [{ type: "text", text: count === 1 ? passwords[0] : passwords.join("\n") }] };
  }
);


// ================================================================
// TOOL: jwt_decode
// ================================================================
server.tool(
  "jwt_decode",
  "Decode a JWT token without verifying the signature. Returns the header and payload.",
  {
    token: z.string().describe("The JWT token to decode"),
  },
  async ({ token }) => {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return { content: [{ type: "text", text: "Error: Invalid JWT format. Expected 3 parts separated by dots." }], isError: true };

      const decode = (str: string) => JSON.parse(Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8"));
      const header = decode(parts[0]);
      const payload = decode(parts[1]);

      // Check expiration
      let expired = null;
      if (payload.exp) {
        const expDate = new Date(payload.exp * 1000);
        expired = expDate < new Date();
        payload._exp_readable = expDate.toISOString();
        payload._expired = expired;
      }
      if (payload.iat) payload._iat_readable = new Date(payload.iat * 1000).toISOString();
      if (payload.nbf) payload._nbf_readable = new Date(payload.nbf * 1000).toISOString();

      return { content: [{ type: "text", text: JSON.stringify({ header, payload, signature: parts[2].slice(0, 20) + "..." }, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Error decoding JWT: ${e.message}` }], isError: true };
    }
  }
);


// ================================================================
// TOOL: word_count
// ================================================================
server.tool(
  "word_count",
  "Count words, characters, sentences, paragraphs, and estimate reading time for a text.",
  {
    text: z.string().describe("The text to analyze"),
  },
  async ({ text }) => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const characters = text.length;
    const characters_no_spaces = text.replace(/\s/g, "").length;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim()).length;
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim()).length || (text.trim() ? 1 : 0);
    const reading_time_minutes = Math.ceil(words / 238);

    return { content: [{ type: "text", text: JSON.stringify({ words, characters, characters_no_spaces, sentences, paragraphs, reading_time_minutes }) }] };
  }
);


// ================================================================
// TOOL: cron_parse
// ================================================================
server.tool(
  "cron_parse",
  "Parse a cron expression into a human-readable description and show next run times.",
  {
    expression: z.string().describe("5-field cron expression (e.g. '*/15 * * * *')"),
  },
  async ({ expression }) => {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) return { content: [{ type: "text", text: "Error: expected 5 fields (minute hour day-of-month month day-of-week)" }], isError: true };

    const [min, hour, dom, month, dow] = parts;
    const describe = (val: string, unit: string) => {
      if (val === "*") return `every ${unit}`;
      if (val.includes("/")) return `every ${val.split("/")[1]} ${unit}s`;
      if (val.includes(",")) return `${unit}s ${val}`;
      if (val.includes("-")) return `${unit}s ${val}`;
      return `${unit} ${val}`;
    };

    const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const monthNames = ["","January","February","March","April","May","June","July","August","September","October","November","December"];

    let desc = "At ";
    desc += min === "*" ? "every minute" : (min.includes("/") ? `every ${min.split("/")[1]} minutes` : `minute ${min}`);
    desc += hour === "*" ? "" : (hour.includes("/") ? `, every ${hour.split("/")[1]} hours` : `, hour ${hour}`);
    desc += dom === "*" ? "" : `, on day ${dom}`;
    desc += month === "*" ? "" : `, in ${monthNames[parseInt(month)] || `month ${month}`}`;
    desc += dow === "*" ? "" : `, on ${dow.split(",").map(d => dayNames[parseInt(d)] || d).join(", ")}`;

    return { content: [{ type: "text", text: JSON.stringify({ expression, fields: { minute: min, hour, day_of_month: dom, month, day_of_week: dow }, description: desc }) }] };
  }
);


// ================================================================
// TOOL: lorem_ipsum
// ================================================================
server.tool(
  "lorem_ipsum",
  "Generate placeholder lorem ipsum text.",
  {
    type: z.enum(["paragraphs", "sentences", "words"]).default("paragraphs"),
    count: z.number().min(1).max(50).default(3).describe("Number of paragraphs/sentences/words"),
  },
  async ({ type, count }) => {
    const words = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum".split(" ");

    const randomWords = (n: number) => Array.from({ length: n }, () => words[Math.floor(Math.random() * words.length)]).join(" ");
    const sentence = () => { const s = randomWords(8 + Math.floor(Math.random() * 12)); return s.charAt(0).toUpperCase() + s.slice(1) + "."; };
    const paragraph = () => Array.from({ length: 4 + Math.floor(Math.random() * 4) }, sentence).join(" ");

    let result;
    if (type === "words") result = randomWords(count);
    else if (type === "sentences") result = Array.from({ length: count }, sentence).join(" ");
    else result = Array.from({ length: count }, paragraph).join("\n\n");

    return { content: [{ type: "text", text: result }] };
  }
);


// ================================================================
// Start server
// ================================================================
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
