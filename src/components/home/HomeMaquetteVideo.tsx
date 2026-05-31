"use client";

import { useEffect } from "react";

/** Assure la lecture de la vidéo hero (maquette HTML statique). */
export default function HomeMaquetteVideo() {
  useEffect(() => {
    const video = document.querySelector<HTMLVideoElement>("video.hero-video");
    video?.play().catch(() => {});
  }, []);

  return null;
}
