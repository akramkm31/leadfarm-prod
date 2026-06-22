import { HOME_SHOWCASE_CALLOUTS } from "@/lib/home-content";
import HomeDashboardPreview from "./HomeDashboardPreview";

export default function HomeShowcase() {
  return (
    <section className="showcase" id="produit">
      <div className="wrap">
        <div className="section-head">
          <div>
            <span className="eyebrow">Le produit</span>
            <h2 style={{ marginTop: 20 }}>
              L&apos;outil qui pense comme un professionnel de l&apos;exploitation.
            </h2>
          </div>
          <p className="lede">
            Pas un progiciel généraliste. Un outil conçu pour le verger industriel — chaque
            écran a été construit avec des agronomes et des chefs d&apos;exploitation, directement
            sur le terrain.
          </p>
        </div>

        <HomeDashboardPreview />

        <div className="showcase-callouts">
          {HOME_SHOWCASE_CALLOUTS.map((item) => (
            <div key={item.num} className="showcase-callout">
              <span className="num">{item.num}</span>
              <div className="t">{item.title}</div>
              <div className="d">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
