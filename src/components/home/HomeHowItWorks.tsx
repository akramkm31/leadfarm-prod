import { HOME_HOW_STEPS } from "@/lib/home-content";
import HomeHowArtChart from "./HomeHowArtChart";

export default function HomeHowItWorks() {
  return (
    <section className="section">
      <div className="wrap">
        <div className="section-head">
          <div>
            <span className="eyebrow">Comment ça marche</span>
            <h2 style={{ marginTop: 20 }}>
              Du parcellaire au registre signé — en quatre étapes structurées.
            </h2>
          </div>
          <p className="lede">
            Une seule saisie par intervention. Chaque donnée terrain construit automatiquement
            les registres officiels. Aucune double entrée, aucun risque d&apos;incohérence documentaire.
          </p>
        </div>

        <div className="how-grid">
          <div className="how-steps">
            {HOME_HOW_STEPS.map((step) => (
              <div key={step.num} className="how-step">
                <span className="how-step-num">{step.num}</span>
                <div className="how-step-body">
                  <div className="how-step-title">{step.title}</div>
                  <div className="how-step-desc">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <HomeHowArtChart />
        </div>
      </div>
    </section>
  );
}
