import { HOME_FEATURES } from "@/lib/home-content";
import { HomeFeatureIcon } from "./HomeIcons";

export default function HomeFeatures() {
  return (
    <section className="section" id="fonctionnalites">
      <div className="wrap">
        <div className="section-head">
          <div>
            <span className="eyebrow">Fonctionnalités</span>
            <h2 style={{ marginTop: 20 }}>
              Un dispositif complet pour le verger industriel professionnel.
            </h2>
          </div>
          <p className="lede">
            Tout ce qu&apos;un exploitant exigeant attend d&apos;un outil de traçabilité —
            cartographie parcelaire, planification des traitements, registres réglementaires et
            surveillance permanente — dans une seule plateforme cohérente.
          </p>
        </div>

        <div className="features-grid">
          {HOME_FEATURES.map((feature) => (
            <div
              key={feature.num}
              className={`feature-card${feature.featured ? " is-feature" : ""}`}
            >
              {feature.tag ? <span className="feature-tag">{feature.tag}</span> : null}
              <div className="feature-icon">
                <HomeFeatureIcon type={feature.icon} />
              </div>
              <span className="feature-num">{feature.num}</span>
              <div className="feature-title">{feature.title}</div>
              <div className="feature-desc">{feature.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
