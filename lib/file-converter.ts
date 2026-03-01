/**
 * File conversion utilities.
 * Converts between common formats entirely client-side.
 */

export interface ConversionOption {
  from: string;
  to: string;
  label: string;
  category: "text" | "data" | "image" | "document";
}

export const CONVERSIONS: ConversionOption[] = [
  // Data formats
  { from: "json", to: "yaml", label: "JSON to YAML", category: "data" },
  { from: "json", to: "csv", label: "JSON to CSV", category: "data" },
  { from: "json", to: "xml", label: "JSON to XML", category: "data" },
  { from: "yaml", to: "json", label: "YAML to JSON", category: "data" },
  { from: "csv", to: "json", label: "CSV to JSON", category: "data" },
  { from: "csv", to: "tsv", label: "CSV to TSV", category: "data" },
  { from: "tsv", to: "csv", label: "TSV to CSV", category: "data" },
  { from: "xml", to: "json", label: "XML to JSON", category: "data" },
  // Text formats
  { from: "md", to: "html", label: "Markdown to HTML", category: "text" },
  { from: "md", to: "txt", label: "Markdown to Plain Text", category: "text" },
  { from: "html", to: "txt", label: "HTML to Plain Text", category: "text" },
  // Image formats
  { from: "png", to: "jpg", label: "PNG to JPEG", category: "image" },
  { from: "jpg", to: "png", label: "JPEG to PNG", category: "image" },
  { from: "png", to: "webp", label: "PNG to WebP", category: "image" },
  { from: "jpg", to: "webp", label: "JPEG to WebP", category: "image" },
  { from: "webp", to: "png", label: "WebP to PNG", category: "image" },
  // Document
  { from: "json", to: "txt", label: "JSON to Text", category: "document" },
  { from: "txt", to: "md", label: "Text to Markdown", category: "document" },
];

export function getAvailableConversions(extension: string): ConversionOption[] {
  const ext = extension.toLowerCase();
  if (ext === "jpeg") return CONVERSIONS.filter((c) => c.from === "jpg");
  return CONVERSIONS.filter((c) => c.from === ext);
}

// ── Text-based converters ────────────────────────────────────────────

function jsonToYaml(json: string): string {
  const obj = JSON.parse(json);
  return yamlStringify(obj, 0);
}

function yamlStringify(value: unknown, indent: number): string {
  const pad = "  ".repeat(indent);
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (value.includes("\n") || value.includes(": ") || value.includes("#")) {
      return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return value.map((item) => `${pad}- ${yamlStringify(item, indent + 1).trimStart()}`).join("\n");
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    return entries
      .map(([k, v]) => {
        const valStr = yamlStringify(v, indent + 1);
        if (typeof v === "object" && v !== null && !Array.isArray(v)) {
          return `${pad}${k}:\n${valStr}`;
        }
        if (Array.isArray(v)) {
          return `${pad}${k}:\n${valStr}`;
        }
        return `${pad}${k}: ${valStr}`;
      })
      .join("\n");
  }
  return String(value);
}

function yamlToJson(yaml: string): string {
  // Simple YAML parser for common cases
  const lines = yaml.split("\n");
  const result: Record<string, unknown> = {};
  let currentKey = "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const colonIdx = trimmed.indexOf(": ");
    if (colonIdx > 0) {
      currentKey = trimmed.slice(0, colonIdx).trim();
      let val: string | number | boolean | null = trimmed.slice(colonIdx + 2).trim();
      if (val === "true") result[currentKey] = true;
      else if (val === "false") result[currentKey] = false;
      else if (val === "null" || val === "~") result[currentKey] = null;
      else if (!isNaN(Number(val)) && val !== "") result[currentKey] = Number(val);
      else if (val.startsWith('"') && val.endsWith('"')) result[currentKey] = val.slice(1, -1);
      else result[currentKey] = val;
    }
  }
  return JSON.stringify(result, null, 2);
}

function jsonToCsv(json: string): string {
  const data = JSON.parse(json);
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("JSON must be an array of objects for CSV conversion");
  }
  const headers = Object.keys(data[0]);
  const rows = data.map((row: Record<string, unknown>) =>
    headers.map((h) => {
      const val = String(row[h] ?? "");
      return val.includes(",") || val.includes('"') || val.includes("\n")
        ? `"${val.replace(/"/g, '""')}"`
        : val;
    }).join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

function csvToJson(csv: string): string {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) throw new Error("CSV must have header + data rows");
  const headers = parseCsvLine(lines[0]);
  const data = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = values[i] ?? ""; });
    return obj;
  });
  return JSON.stringify(data, null, 2);
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (inQuotes) {
      if (line[i] === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (line[i] === '"') inQuotes = false;
      else current += line[i];
    } else {
      if (line[i] === '"') inQuotes = true;
      else if (line[i] === ",") { result.push(current); current = ""; }
      else current += line[i];
    }
  }
  result.push(current);
  return result;
}

function csvToTsv(csv: string): string {
  return csv.split("\n").map((line) => parseCsvLine(line).join("\t")).join("\n");
}

function tsvToCsv(tsv: string): string {
  return tsv.split("\n").map((line) => {
    return line.split("\t").map((cell) =>
      cell.includes(",") || cell.includes('"') ? `"${cell.replace(/"/g, '""')}"` : cell
    ).join(",");
  }).join("\n");
}

function jsonToXml(json: string): string {
  const obj = JSON.parse(json);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<root>\n${objectToXml(obj, 1)}</root>`;
}

function objectToXml(obj: unknown, indent: number): string {
  const pad = "  ".repeat(indent);
  if (obj === null || obj === undefined) return "";
  if (typeof obj !== "object") return `${pad}${String(obj)}`;
  if (Array.isArray(obj)) {
    return obj.map((item, i) => `${pad}<item index="${i}">\n${objectToXml(item, indent + 1)}\n${pad}</item>`).join("\n");
  }
  return Object.entries(obj as Record<string, unknown>)
    .map(([key, value]) => {
      const safeName = key.replace(/[^a-zA-Z0-9_-]/g, "_");
      if (typeof value === "object" && value !== null) {
        return `${pad}<${safeName}>\n${objectToXml(value, indent + 1)}\n${pad}</${safeName}>`;
      }
      return `${pad}<${safeName}>${escapeXml(String(value ?? ""))}</${safeName}>`;
    })
    .join("\n");
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function xmlToJson(xml: string): string {
  // Simplified XML to JSON - extract key-value pairs
  const result: Record<string, string> = {};
  const tagRegex = /<([a-zA-Z_][a-zA-Z0-9_-]*)>([^<]*)<\/\1>/g;
  let match;
  while ((match = tagRegex.exec(xml)) !== null) {
    result[match[1]] = match[2];
  }
  return JSON.stringify(result, null, 2);
}

function mdToHtml(md: string): string {
  let html = md;
  // Headers
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  // Bold / Italic
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  // Lists
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  // Paragraphs
  html = html.replace(/\n\n/g, "</p><p>");
  html = `<p>${html}</p>`;
  return html;
}

function mdToTxt(md: string): string {
  let text = md;
  text = text.replace(/^#{1,6}\s+/gm, "");
  text = text.replace(/\*\*(.+?)\*\*/g, "$1");
  text = text.replace(/\*(.+?)\*/g, "$1");
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  text = text.replace(/^[-*+]\s+/gm, "  - ");
  return text;
}

function htmlToTxt(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
}

// ── Image conversion ─────────────────────────────────────────────────

async function convertImage(
  blob: Blob,
  toFormat: "png" | "jpeg" | "webp"
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error("Conversion failed"));
        },
        `image/${toFormat}`,
        0.92
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(blob);
  });
}

// ── Main convert function ────────────────────────────────────────────

export async function convertFile(
  content: string | ArrayBuffer,
  fromExt: string,
  toExt: string
): Promise<{ content: string | Blob; mimeType: string; extension: string }> {
  const from = fromExt.toLowerCase() === "jpeg" ? "jpg" : fromExt.toLowerCase();
  const to = toExt.toLowerCase() === "jpeg" ? "jpg" : toExt.toLowerCase();
  const key = `${from}->${to}`;

  // Image conversions
  if (["png", "jpg", "webp"].includes(from) && ["png", "jpg", "webp"].includes(to)) {
    const blob = content instanceof ArrayBuffer
      ? new Blob([content])
      : new Blob([content]);
    const fmt = to === "jpg" ? "jpeg" : to;
    const converted = await convertImage(blob, fmt as "png" | "jpeg" | "webp");
    const mimeMap: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };
    return { content: converted, mimeType: mimeMap[to] || "application/octet-stream", extension: to };
  }

  // Text-based conversions
  const text = typeof content === "string" ? content : new TextDecoder().decode(content);

  const converters: Record<string, () => string> = {
    "json->yaml": () => jsonToYaml(text),
    "json->csv": () => jsonToCsv(text),
    "json->xml": () => jsonToXml(text),
    "json->txt": () => JSON.stringify(JSON.parse(text), null, 2),
    "yaml->json": () => yamlToJson(text),
    "csv->json": () => csvToJson(text),
    "csv->tsv": () => csvToTsv(text),
    "tsv->csv": () => tsvToCsv(text),
    "xml->json": () => xmlToJson(text),
    "md->html": () => mdToHtml(text),
    "md->txt": () => mdToTxt(text),
    "html->txt": () => htmlToTxt(text),
    "txt->md": () => text,
  };

  const converter = converters[key];
  if (!converter) throw new Error(`Unsupported conversion: ${from} to ${to}`);

  const result = converter();
  const mimeMap: Record<string, string> = {
    json: "application/json", yaml: "text/yaml", yml: "text/yaml",
    csv: "text/csv", tsv: "text/tab-separated-values",
    xml: "application/xml", html: "text/html", txt: "text/plain",
    md: "text/markdown",
  };

  return { content: result, mimeType: mimeMap[to] || "text/plain", extension: to };
}
