import { HOME_TRUST_TILES } from "@/lib/home-content";

export default function HomeTrust() {
  return (
    <section className="trust" id="conformite">
      <div className="wrap">
        <div className="trust-head">
          <span className="eyebrow">Conformité &amp; certifications</span>
          <span className="l">
            LeadFarm produit les documents exigés par les certifications export et les audits
            réglementaires, sans charge documentaire supplémentaire pour vos équipes.
          </span>
        </div>
        <div className="trust-grid">
          {HOME_TRUST_TILES.map((tile) => (
            <div key={tile.sub} className="trust-tile">
              <span className="sub">{tile.sub}</span>
              <span className="nm">{tile.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
