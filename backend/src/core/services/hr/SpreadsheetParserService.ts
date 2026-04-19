import zlib from "node:zlib";
import type { HrImportFileType, ParsedSpreadsheet } from "../../models/hrImportModels.js";

function normalizeCell(value: unknown): string {
  const normalized = String(value ?? "").trim();
  return /^[=+\-@]/.test(normalized) ? `'${normalized}` : normalized;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map(normalizeCell);
}

function xmlDecode(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

interface ZipEntry {
  name: string;
  data: Buffer;
}

function readZipEntries(buffer: Buffer): ZipEntry[] {
  const entries: ZipEntry[] = [];
  let offset = 0;
  while (offset + 30 < buffer.length) {
    const signature = buffer.readUInt32LE(offset);
    if (signature !== 0x04034b50) break;
    const method = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const fileNameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + fileNameLength + extraLength;
    const name = buffer.subarray(nameStart, nameStart + fileNameLength).toString("utf8");
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
    const data = method === 0 ? compressed : zlib.inflateRawSync(compressed);
    entries.push({ name, data });
    offset = dataStart + compressedSize;
  }
  return entries;
}

function columnIndex(cellRef: string): number {
  const letters = cellRef.replace(/[0-9]/g, "");
  let index = 0;
  for (const letter of letters) {
    index = index * 26 + (letter.charCodeAt(0) - 64);
  }
  return index - 1;
}

function parseSharedStrings(xml: string): string[] {
  return [...xml.matchAll(/<si[\s\S]*?<\/si>/g)].map((match) => {
    const texts = [...match[0].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((text) => xmlDecode(text[1]));
    return texts.join("");
  });
}

function parseXlsx(buffer: Buffer): ParsedSpreadsheet {
  const entries = readZipEntries(buffer);
  const sharedStringsXml = entries.find((entry) => entry.name === "xl/sharedStrings.xml")?.data.toString("utf8");
  const sharedStrings = sharedStringsXml ? parseSharedStrings(sharedStringsXml) : [];
  const sheetXml = entries.find((entry) => entry.name === "xl/worksheets/sheet1.xml")?.data.toString("utf8");
  if (!sheetXml) {
    throw new Error("XLSX workbook does not contain xl/worksheets/sheet1.xml");
  }

  const table: string[][] = [];
  for (const rowMatch of sheetXml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: string[] = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cellMatch[1];
      const body = cellMatch[2];
      const ref = attrs.match(/r="([^"]+)"/)?.[1] ?? `A${table.length + 1}`;
      const type = attrs.match(/t="([^"]+)"/)?.[1];
      const rawValue = body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? body.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] ?? "";
      const value = type === "s" ? sharedStrings[Number(rawValue)] ?? "" : xmlDecode(rawValue);
      row[columnIndex(ref)] = normalizeCell(value);
    }
    table.push(row);
  }

  const headers = (table.shift() ?? []).map(normalizeCell);
  const rows = table
    .filter((row) => row.some((cell) => normalizeCell(cell)))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, normalizeCell(row[index])])));
  return { headers, rows };
}

export class SpreadsheetParserService {
  parse(fileType: HrImportFileType, content: Buffer): ParsedSpreadsheet {
    if (fileType === "csv") {
      const lines = content
        .toString("utf8")
        .replace(/^\uFEFF/, "")
        .split(/\r?\n/)
        .filter((line) => line.trim().length > 0);
      const headers = parseCsvLine(lines[0] ?? "");
      const rows = lines.slice(1).map((line) => {
        const values = parseCsvLine(line);
        return Object.fromEntries(headers.map((header, index) => [header, normalizeCell(values[index])]));
      });
      return { headers, rows };
    }
    return parseXlsx(content);
  }
}
