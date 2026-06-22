import { HOME_STACK_CELLS } from "@/lib/home-content";

export default function HomeStack() {
  return (
    <section className="section" id="stack">
      <div className="wrap">
        <div className="section-head">
          <div>
            <span className="eyebrow">Nos garanties</span>
            <h2 style={{ marginTop: 20 }}>
              Une infrastructure conçue pour résister à dix ans d&apos;audits.
            </h2>
          </div>
          <p className="lede">
            Vos registres du premier jour restent aussi lisibles au dixième audit qu&apos;au moment
            de leur création. Vous demeurez propriétaire absolu de l&apos;intégralité de vos données,
            sans condition ni dépendance envers un fournisseur.
          </p>
        </div>

        <div className="stack-grid">
          {HOME_STACK_CELLS.map((cell) => (
            <div key={cell.role} className="stack-cell">
              <span className="stack-role">{cell.role}</span>
              <span className="stack-name">{cell.name}</span>
              <span className="stack-meta">{cell.meta}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
