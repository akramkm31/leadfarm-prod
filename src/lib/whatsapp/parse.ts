/** Parse a pasted WhatsApp export into individual dated messages.
 *  Handles both header formats present in the field logs:
 *    [04/06, 09:33] Author: body         (DD/MM, HH:MM — no year)
 *    [21:08, 6/12/2026] Author: body     (HH:MM, M/D/YYYY)
 *  Bodies may span multiple lines until the next header line.
 */
export interface ParsedMessage {
  rawDate: string;
  sentAt: string | null; // ISO
  author: string;
  body: string;
  hash: string;
}

const HEADER_RE = /^\[([^\]]+)\]\s*([^:]{1,40}?):\s?(.*)$/;

function stableHash(input: string): string {
  // FNV-1a 32-bit → hex (deterministic, dependency-free)
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** Best-effort ISO timestamp from the bracket header. Year defaults to 2026. */
function toIso(raw: string): string | null {
  const s = raw.trim();
  // Format A: DD/MM, HH:MM  (optionally with year)
  let m = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?,\s*(\d{1,2}):(\d{2})/);
  if (m) {
    const [, dd, mm, yy, hh, mi] = m;
    const year = yy ? (yy.length === 2 ? `20${yy}` : yy) : "2026";
    return isoOrNull(year, mm, dd, hh, mi);
  }
  // Format B: HH:MM, M/D/YYYY
  m = s.match(/^(\d{1,2}):(\d{2}),\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    const [, hh, mi, mo, dd, yy] = m;
    const year = yy.length === 2 ? `20${yy}` : yy;
    return isoOrNull(year, mo, dd, hh, mi);
  }
  return null;
}

function isoOrNull(y: string, mo: string, d: string, h: string, mi: string): string | null {
  const p = (n: string, w = 2) => n.padStart(w, "0");
  const iso = `${y}-${p(mo)}-${p(d)}T${p(h)}:${p(mi)}:00`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

export function parseWhatsApp(text: string): ParsedMessage[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: ParsedMessage[] = [];
  let cur: { rawDate: string; author: string; body: string[] } | null = null;

  const flush = () => {
    if (!cur) return;
    const body = cur.body.join("\n").trim();
    if (body) {
      out.push({
        rawDate: cur.rawDate,
        sentAt: toIso(cur.rawDate),
        author: cur.author.trim(),
        body,
        hash: stableHash(`${cur.rawDate}|${cur.author}|${body}`),
      });
    }
    cur = null;
  };

  for (const line of lines) {
    const m = line.match(HEADER_RE);
    if (m) {
      flush();
      cur = { rawDate: m[1], author: m[2], body: m[3] ? [m[3]] : [] };
    } else if (cur) {
      cur.body.push(line);
    }
  }
  flush();
  return out;
}
