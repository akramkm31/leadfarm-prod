/** Libellés carte Leaflet — lisibles sur fond satellite clair ou foncé */

export function escapeMapHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Pastille nom de parcelle (contraste garanti) */
export function parcelleLabelHtml(name: string, accentColor = "#203b14"): string {
  const safe = escapeMapHtml(name.trim() || "Sans nom");
  return `<div style="
    display:inline-block;
    max-width:220px;
    padding:4px 10px;
    border-radius:6px;
    background:rgba(10,29,8,0.88);
    border:1px solid ${accentColor};
    color:#f5f8f0;
    font-family:system-ui,-apple-system,sans-serif;
    font-size:11px;
    font-weight:600;
    line-height:1.35;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
    box-shadow:0 2px 10px rgba(0,0,0,0.4);
    pointer-events:none;
  ">${safe}</div>`;
}

export function parcelleLabelIconAnchor(): [number, number] {
  return [0, 16];
}
