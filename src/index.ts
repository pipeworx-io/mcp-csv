interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * CSV <-> JSON MCP.
 *
 * Keyless, offline: parse RFC 4180 CSV to JSON (rows as objects keyed by the
 * header, or as arrays) and serialize JSON rows back to CSV with correct
 * quoting. Pure functions — no API, no key.
 */


function parseCSV(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === delim) { row.push(field); field = ''; }
    else if (c === '\r') { /* handled by \n */ }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function csvField(v: unknown, delim: string): string {
  const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[\r\n"]/.test(s) || s.includes(delim) ? `"${s.replace(/"/g, '""')}"` : s;
}

const tools: McpToolExport['tools'] = [
  {
    name: 'csv_to_json',
    description: 'Parse RFC 4180 CSV into JSON (keyless, offline). With `header` true (default) the first row becomes object keys; otherwise rows are returned as arrays. Handles quoted fields, escaped quotes, and embedded commas/newlines. Set `delimiter` for TSV etc.',
    inputSchema: {
      type: 'object',
      properties: {
        csv: { type: 'string', description: 'The CSV text.' },
        header: { type: 'boolean', description: 'Treat the first row as a header (default true).' },
        delimiter: { type: 'string', description: 'Field delimiter (default ",").' },
      },
      required: ['csv'],
    },
  },
  {
    name: 'json_to_csv',
    description: 'Serialize an array of JSON objects (or arrays) to CSV (keyless, offline). Object keys become the header (union of all keys, in first-seen order). Fields are quoted when needed.',
    inputSchema: {
      type: 'object',
      properties: {
        rows: { type: 'array', description: 'An array of objects (or arrays) to serialize.' },
        delimiter: { type: 'string', description: 'Field delimiter (default ",").' },
      },
      required: ['rows'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const delim = typeof args.delimiter === 'string' && args.delimiter.length ? args.delimiter : ',';
  switch (name) {
    case 'csv_to_json': {
      const csv = reqStr(args, 'csv', '"a,b\\n1,2"');
      const withHeader = args.header !== false;
      const rows = parseCSV(csv.replace(/\n+$/, ''), delim);
      if (rows.length === 0) return { rows: [], count: 0 };
      if (!withHeader) return { count: rows.length, rows };
      const keys = rows[0];
      const objs = rows.slice(1).map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i] ?? ''])));
      return { columns: keys, count: objs.length, rows: objs };
    }
    case 'json_to_csv': {
      const rows = args.rows;
      if (!Array.isArray(rows)) throw new Error('Required argument "rows" must be an array.');
      if (rows.length === 0) return { csv: '' };
      if (Array.isArray(rows[0])) {
        return { csv: rows.map((r: unknown[]) => r.map((v) => csvField(v, delim)).join(delim)).join('\r\n') };
      }
      const keys: string[] = [];
      for (const r of rows) if (r && typeof r === 'object') for (const k of Object.keys(r)) if (!keys.includes(k)) keys.push(k);
      const lines = [keys.map((k) => csvField(k, delim)).join(delim)];
      for (const r of rows) lines.push(keys.map((k) => csvField((r as Record<string, unknown>)?.[k], delim)).join(delim));
      return { columns: keys, rows: rows.length, csv: lines.join('\r\n') };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function reqStr(args: Record<string, unknown>, key: string, ex: string): string {
  const v = args[key];
  if (typeof v !== 'string' || v.length === 0) throw new Error(`Required argument "${key}" is missing. Pass a string like ${ex}.`);
  return v;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
