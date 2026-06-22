import { HOME_CUSTOMER_STATS } from "@/lib/home-content";

export default function HomeCustomer() {
  return (
    <section className="section" id="client">
      <div className="wrap">
        <div className="customer">
          <div>
            <span className="eyebrow">Client pilote</span>
            <div className="customer-quote" style={{ marginTop: 24 }}>
              « Avant, un seul audit mobilisait{" "}
              <span className="em">deux jours de recherche documentaire</span>. Aujourd&apos;hui,
              l&apos;inspecteur ouvre LeadFarm et consulte{" "}
              <span className="em">huit ans d&apos;interventions</span> en moins d&apos;une minute —
              sans qu&apos;un seul document soit introuvable. »
            </div>
            <div className="customer-meta">
              <span className="nm">Yacine Khelifa</span>
              <span className="ro">DIRECTEUR D&apos;EXPLOITATION · DOMAINE KHELIFA</span>
            </div>
          </div>

          <div className="customer-card">
            <span className="eyebrow">Le Domaine Khelifa en chiffres</span>
            <div className="customer-stats">
              {HOME_CUSTOMER_STATS.map((stat) => (
                <div key={stat.label} className="customer-stat">
                  <div className="v">{stat.value}</div>
                  <div className="l">{stat.label}</div>
                </div>
              ))}
            </div>
            <div
              style={{
                borderTop: "1px solid #c5ccb6",
                paddingTop: 20,
                fontSize: 13,
                color: "#0a1d08",
                letterSpacing: "-0.02em",
              }}
            >
              Sidi Bel Abbès · Algérie · Pommier, olivier, amandier · Visée commerciale
              Groupe Lachhab
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
