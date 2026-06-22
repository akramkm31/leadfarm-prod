import Link from "next/link";
import { HOME_CTA_SIDE } from "@/lib/home-content";
import { appPath } from "@/lib/app-url";
import { HomeArrowIcon } from "./HomeIcons";

export default function HomeCta() {
  return (
    <section className="cta" id="cta">
      <div className="wrap">
        <div className="cta-card">
          <div>
            <span className="eyebrow">Passez à l&apos;action</span>
            <h2>Planifiez votre prochain audit avec sérénité.</h2>
            <p>
              Déploiement complet en moins de deux semaines — parcellaire, migration des
              registres existants et formation des équipes inclus. Démonstration en 20 minutes,
              ou visite terrain au Domaine Khelifa sur demande.
            </p>
            <div className="cta-actions">
              <a className="btn btn-primary" href="mailto:contact@leadfarm.dz">
                Planifier une démo
              </a>
              <Link className="btn btn-secondary" href={appPath("/dashboard")}>
                Ouvrir le produit
                <HomeArrowIcon />
              </Link>
            </div>
          </div>

          <div className="cta-side">
            {HOME_CTA_SIDE.map((item) => (
              <div key={item.title} className="cta-side-item">
                <span className="t">{item.title}</span>
                <span className="d">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
