// /audit — SCD2 versioned journal rendered as geological strata cores
const AUDIT_CORES = [
  {
    entity: "parcelle",
    id: "P-A13",
    name: "Verger A13 · Pommier Golden",
    versions: [
      { v: 4, date: "2026-02-14", change: "Surface ajustée +0.3 ha", by: "Y. Khelifa", current: true,  field: "surface_ha",   from: "7.8",   to: "8.1" },
      { v: 3, date: "2025-11-02", change: "Greffage Golden Reinders",   by: "M. Berrahal",                field: "variete",     from: "Golden", to: "Golden Reinders" },
      { v: 2, date: "2024-09-18", change: "Densité augmentée",           by: "Y. Khelifa",                 field: "densite_ha",  from: "1250",  to: "1380" },
      { v: 1, date: "2019-03-04", change: "Création parcelle",            by: "Système",                    field: "—",            from: "—",     to: "creé" },
    ]
  },
  {
    entity: "produit",
    id: "PR-CU042",
    name: "Bouillie cuivrique 42 g/L",
    versions: [
      { v: 3, date: "2026-01-22", change: "DAR mis à jour 21j", by: "ANSES", current: true, field: "dar_jours", from: "14", to: "21" },
      { v: 2, date: "2024-05-12", change: "Dose homologuée 2.5 L/ha", by: "ANSES",          field: "dose_max",  from: "3.0", to: "2.5" },
      { v: 1, date: "2018-08-30", change: "Référencement initial",     by: "Système",        field: "—",         from: "—",   to: "creé" },
    ]
  },
  {
    entity: "plantation",
    id: "PL-D08-A",
    name: "Amandier D08 · zone A",
    versions: [
      { v: 2, date: "2025-04-08", change: "Distance ligne 5m → 6m", by: "K. Benali", current: true, field: "espacement_m", from: "5", to: "6" },
      { v: 1, date: "2010-03-21", change: "Plantation initiale",      by: "Système",                 field: "—",            from: "—", to: "creé" },
    ]
  },
];

const LAYER_COLORS = ["#203b14","#3a5a26","#7a4a1a","#a07a3a","#c8a35a"];

function AuditView() {
  const [active, setActive] = React.useState({ coreIdx: 0, vIdx: 0 });
  const core = AUDIT_CORES[active.coreIdx];
  const ver = core.versions[active.vIdx];

  return (
    <div className="audit-screen screen scroll-y" data-screen-label="audit">
      <div className="audit-hero">
        <div>
          <div className="mono audit-eyebrow">JOURNAL SCD2 · DOMAINE KHELIFA</div>
          <h1 className="audit-title">Carottes d'audit · 247 entités versionnées</h1>
          <p className="audit-lede">Chaque modification ferme la ligne courante (<span className="mono">est_version_actuelle = false</span>) et insère une nouvelle version. Les <span className="mono">UPDATE</span> directs sont interdits par déclencheur. Lisez les strates de bas en haut comme un échantillon de sol.</p>
        </div>
        <div className="audit-stats">
          <div className="audit-stat"><div className="audit-stat-val">1 248</div><div className="mono audit-stat-lbl">VERSIONS</div></div>
          <div className="audit-stat"><div className="audit-stat-val">247</div><div className="mono audit-stat-lbl">ENTITÉS</div></div>
          <div className="audit-stat"><div className="audit-stat-val">0</div><div className="mono audit-stat-lbl">UPDATE FORCÉS</div></div>
        </div>
      </div>

      <div className="audit-layout">
        {/* The cores */}
        <div className="cores-wrap">
          <div className="cores-axis-wrap">
            <div className="cores-axis mono">
              <span>2026</span>
              <span>2024</span>
              <span>2022</span>
              <span>2020</span>
              <span>2018</span>
              <span>2010</span>
            </div>
            <div className="cores-row">
              {AUDIT_CORES.map((c, ci) => (
                <Core
                  key={c.id}
                  core={c}
                  coreIdx={ci}
                  active={active}
                  onSelect={(vIdx) => setActive({ coreIdx: ci, vIdx })}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Inspector */}
        <div className="audit-inspector">
          <div className="insp-head">
            <div className="mono insp-eyebrow">{core.entity.toUpperCase()} · {core.id}</div>
            <h3 className="insp-title">{core.name}</h3>
          </div>

          <div className="insp-version">
            <div className="insp-vdot" style={{background: LAYER_COLORS[active.vIdx % LAYER_COLORS.length]}}>v{ver.v}</div>
            <div>
              <div className="mono insp-vlbl">{ver.date} · {ver.current ? "ACTUELLE" : "ARCHIVÉE"}</div>
              <div className="insp-vchange">{ver.change}</div>
              <div className="mono insp-vby">PAR {ver.by.toUpperCase()}</div>
            </div>
          </div>

          <div className="diff-card">
            <div className="mono diff-head">DIFF · CHAMP {ver.field.toUpperCase()}</div>
            <div className="diff-rows">
              <div className="diff-row diff-old"><span className="mono diff-tag">– AVANT</span><span className="diff-val">{ver.from}</span></div>
              <div className="diff-row diff-new"><span className="mono diff-tag">+ APRÈS</span><span className="diff-val">{ver.to}</span></div>
            </div>
          </div>

          <div className="rpc-card">
            <div className="mono rpc-head">RPC TRANSACTIONNEL</div>
            <pre className="rpc-code mono">{`SELECT update_${core.entity}_scd2(
  p_id        => '${core.id}',
  p_field     => '${ver.field}',
  p_new_value => '${ver.to}',
  p_actor     => '${ver.by}'
);`}</pre>
          </div>

          <div className="insp-actions">
            <button className="btn btn-tertiary"><window.IconDownload size={13}/>Export CSV</button>
            <button className="btn btn-tertiary"><window.IconClock size={13}/>Restaurer (créera v{core.versions[0].v + 1})</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Core({ core, coreIdx, active, onSelect }) {
  // Position versions along a 0..1 axis based on date span 2010..2026
  const yearMin = 2010, yearMax = 2026, span = yearMax - yearMin;
  const yOf = (date) => {
    const y = parseInt(date.slice(0, 4), 10);
    return ((y - yearMin) / span);
  };

  return (
    <div className="core">
      <div className="core-label">
        <div className="mono core-label-lbl">{core.entity.toUpperCase()}</div>
        <div className="core-label-name">{core.name}</div>
        <div className="mono core-label-id">{core.id}</div>
      </div>

      <div className="core-tube">
        {core.versions.slice().reverse().map((v, i) => {
          const origIdx = core.versions.length - 1 - i;
          const next = i + 1 < core.versions.length ? core.versions.slice().reverse()[i + 1] : { date: "2026-12-31" };
          const yTop = yOf(v.date);
          const yBot = yOf(next.date);
          const top = (1 - yBot) * 100;
          const height = (yBot - yTop) * 100;
          const isActive = active.coreIdx === coreIdx && active.vIdx === origIdx;
          return (
            <div
              key={origIdx}
              className={"core-layer" + (isActive ? " is-active" : "") + (v.current ? " is-current" : "")}
              style={{
                top: `${Math.max(0, top)}%`,
                height: `${Math.max(6, height)}%`,
                background: LAYER_COLORS[origIdx % LAYER_COLORS.length],
              }}
              onClick={() => onSelect(origIdx)}
            >
              <span className="mono core-layer-v">v{v.v}</span>
              <span className="core-layer-date mono">{v.date.slice(0, 7)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

window.AuditView = AuditView;
