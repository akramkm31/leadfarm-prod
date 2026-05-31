import { getHomeMaquette } from "@/lib/home-maquette";
import HomeMaquetteVideo from "./HomeMaquetteVideo";

/**
 * Rendu copie-conforme de public/soutenance design (2)/Home.html
 * (HTML + CSS inline identiques, liens/vidéo adaptés à Next.js).
 */
export default function HomeMaquette() {
  const { css, html } = getHomeMaquette();

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Fragment+Mono&family=Inter:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <HomeMaquetteVideo />
    </>
  );
}
