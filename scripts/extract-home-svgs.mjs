import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const raw = readFileSync(
  join(process.cwd(), "public", "soutenance  design (2)", "Home.html"),
  "utf-8"
);

function svgToJsx(svg) {
  return svg
    .replace(/stroke-width=/g, "strokeWidth=")
    .replace(/font-family=/g, "fontFamily=")
    .replace(/font-size=/g, "fontSize=")
    .replace(/font-weight=/g, "fontWeight=")
    .replace(/letter-spacing=/g, "letterSpacing=")
    .replace(/text-anchor=/g, "textAnchor=")
    .replace(/stroke-linecap=/g, "strokeLinecap=")
    .replace(/stroke-linejoin=/g, "strokeLinejoin=")
    .replace(/fill-opacity=/g, "fillOpacity=")
    .replace(/stroke-dasharray=/g, "strokeDasharray=")
    .replace(/marker-end=/g, "markerEnd=")
    .replace(/markerWidth=/g, "markerWidth=")
    .replace(/markerHeight=/g, "markerHeight=")
    .replace(/refX=/g, "refX=")
    .replace(/refY=/g, "refY=")
    .replace(/viewBox=/g, "viewBox=")
    .replace(/preserveAspectRatio=/g, "preserveAspectRatio=")
    .replace(/patternUnits=/g, "patternUnits=")
    .replace(/class=/g, "className=")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();
}

function wrapComponent(name, svg, extraClass) {
  const jsx = svgToJsx(svg);
  const cls = extraClass ? ` className="${extraClass}"` : "";
  return `"use client";

export default function ${name}() {
  return (
    ${jsx.replace(/^<svg/, `<svg${cls ? cls.replace('className=', 'className=') : ''}`).replace('<svg', extraClass ? `<svg className="${extraClass}"` : '<svg')}
  );
}
`;
}

const showcaseSvg = raw.match(
  /<div class="showcase-screen">\s*([\s\S]*?)<\/div>\s*\n\s*<div class="showcase-callouts">/
)?.[1]?.trim();

const howSvg = raw.match(
  /<div class="how-art">\s*([\s\S]*?)<\/div>\s*\n\s*<\/div>\s*\n\s*<\/div>\s*\n<\/section>\s*\n<!-- ═══════════════ GUARANTEES/
)?.[1]?.trim();

const dir = join(process.cwd(), "src", "components", "home");
mkdirSync(dir, { recursive: true });

if (showcaseSvg) {
  const content = `"use client";

export default function HomeDashboardPreview() {
  return (
    <div className="showcase-screen">
      ${svgToJsx(showcaseSvg.replace(/^<svg/, "<svg style={{ width: '100%', height: '100%', display: 'block' }}"))}
    </div>
  );
}
`;
  writeFileSync(join(dir, "HomeDashboardPreview.tsx"), content);
}

if (howSvg) {
  const inner = howSvg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  const content = `"use client";

export default function HomeHowArtChart() {
  return (
    <div className="how-art">
      <svg viewBox="0 0 520 480" style={{ width: "100%", height: "100%" }}>
        ${svgToJsx(inner)}
      </svg>
    </div>
  );
}
`;
  writeFileSync(join(dir, "HomeHowArtChart.tsx"), content);
}

console.log("SVG components written");
