import { readFileSync } from "fs";
import { join } from "path";

const HOME_HTML_PATH = join(
  process.cwd(),
  "public",
  "soutenance  design (2)",
  "Home.html"
);

/** Charge le corps + CSS de la maquette soutenance (copie conforme de Home.html). */
export function getHomeMaquette(): { css: string; html: string } {
  const raw = readFileSync(HOME_HTML_PATH, "utf-8");

  const css = raw.match(/<style>([\s\S]*?)<\/style>/)?.[1]?.trim() ?? "";
  let html = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1]?.trim() ?? "";

  html = patchHomeMaquetteHtml(html);

  return { css, html };
}

function patchHomeMaquetteHtml(html: string): string {
  return (
    html
      .replace(
        /uploads\/Tractor_atomiser_not_moving_202605240156\.mp4/g,
        "/media/hero-tractor-atomiser.mp4"
      )
      .replace(/(<a class="btn btn-tertiary" href=")LeadFarm\.html"/gi, '$1/login"')
      .replace(/href="LeadFarm\.html"/gi, 'href="/dashboard"')
      .replace(/href='LeadFarm\.html'/gi, "href='/dashboard'")
      .replace(/href="\/cdn-cgi\/l\/email-protection[^"]*"/gi, 'href="#cta"')
      .replace(/<script[\s\S]*?<\/script>/gi, "")
  );
}
