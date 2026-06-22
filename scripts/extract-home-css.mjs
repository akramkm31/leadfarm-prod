import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const raw = readFileSync(
  join(process.cwd(), "public", "soutenance  design (2)", "Home.html"),
  "utf-8"
);
const css = raw.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";

let out = css
  .replace(/^html\{scroll-behavior:smooth\}/m, "")
  .replace(/^body\{/m, ".lf-home-page{")
  .replace(
    /^\*,\*::before,\*::after\{[^}]+\}/m,
    ".lf-home-page,.lf-home-page *,.lf-home-page *::before,.lf-home-page *::after{box-sizing:border-box}"
  );

out = out
  .split("\n")
  .map((line) => {
    const t = line.trim();
    if (!t || t.startsWith(":root") || t.startsWith("@") || t.startsWith("/*")) return line;
    if (/^\.[a-zA-Z_-]/.test(t)) return `.lf-home-page ${line}`;
    return line;
  })
  .join("\n");

writeFileSync(join(process.cwd(), "src", "styles", "home-maquette.css"), out);
console.log("Wrote home-maquette.css", out.length, "bytes");
