"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { HOME_HERO_META } from "@/lib/home-content";
import { appPath } from "@/lib/app-url";
import { HomeArrowIcon } from "./HomeIcons";

export default function HomeHero() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    videoRef.current?.play().catch(() => {});
  }, []);

  return (
    <section className="hero">
      <div className="wrap">
        <div className="hero-inner">
          <div>
            <div className="eyebrow hero-eyebrow">
              <span className="gp-dot" />
              SOLUTION DE RÉFÉRENCE · VERGERS INDUSTRIELS
            </div>
            <h1 className="hero-title">
              Pilotez l&apos;exploitation.{" "}
              <span className="em">Dominez l&apos;audit réglementaire.</span>
            </h1>
            <p className="hero-lede">
              LeadFarm centralise la cartographie parcelaire, la planification des traitements
              et la traçabilité opérateur dans une plateforme unique. Chaque intervention est
              géoréférencée, horodatée et consignée — pour respecter vos DAR, documenter votre
              IFT et présenter aux contrôles un cahier de culture irréprochable.
            </p>
            <div className="hero-actions">
              <a className="btn btn-primary" href="#cta">
                Demander une démo
                <HomeArrowIcon />
              </a>
              <Link className="btn btn-secondary" href={appPath("/dashboard")}>
                Voir le produit en action
              </Link>
            </div>
            <div className="hero-meta">
              {HOME_HERO_META.map((item) => (
                <div key={item.label} className="hero-meta-item">
                  <span className="v">{item.value}</span>
                  <span className="l">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-art">
            <div className="hero-video-frame">
              <video
                ref={videoRef}
                className="hero-video"
                autoPlay
                muted
                loop
                playsInline
                poster=""
              >
                <source src="/media/hero-tractor-atomiser.mp4" type="video/mp4" />
              </video>
              <div className="hero-video-tag">
                <span className="hv-dot" />
                <span className="mono">EN COURS · VERGER A13</span>
              </div>
              <div className="hero-video-meta">
                <span className="mono">TRAITEMENT EN COURS · VERGER A13</span>
              </div>
            </div>

            <div
              className="parcel-card"
              style={{ top: "8%", left: "-4%", transform: "rotate(-2deg)" }}
            >
              <span className="lbl">PARCELLE A7 · 12.4 HA</span>
              <span className="nm">Pommier · Gala</span>
              <span className="v">EN ATTENTE DAR · 16:00</span>
            </div>
            <div
              className="parcel-card"
              style={{ top: "64%", right: "-6%", transform: "rotate(3deg)" }}
            >
              <span className="lbl">OPÉRATEUR · L. MANSOUR</span>
              <span className="nm">Vent 12 km/h · CONFORME</span>
              <span className="v">PROGRESSION 58% · 14:32</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
