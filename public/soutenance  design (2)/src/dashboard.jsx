// /dashboard — operational KPIs, alerts, mini-map, registry status
function DashboardView({ onNav, tweak }) {
  return (
    <div className="dashboard-screen screen scroll-y" data-screen-label="dashboard">
      <div className="dash-hero">
        <div className="dash-hero-text">
          <div className="mono dash-eyebrow">BONJOUR · MARDI 24 FÉVRIER 2026 · 14:32</div>
          <h1 className="dash-title">8 traitements planifiés cette semaine. <span className="dash-title-faded">3 fenêtres météo favorables.</span></h1>
          <div className="dash-actions">
            <button className="btn btn-primary"><window.IconPlus size={14}/>Planifier un traitement</button>
            <button className="btn btn-tertiary" onClick={() => onNav("parcelles")}><window.IconMap size={14}/>Ouvrir la carte</button>
            <button className="btn btn-tertiary"><window.IconDownload size={14}/>Registre du jour (PDF)</button>
          </div>
        </div>
        <div className="dash-hero-ill">
          <ContourBadge/>
        </div>
      </div>

      <div className="dash-kpi-row">
        <KpiCard label="SURFACE TOTALE" value="247.3" unit="ha" trend="+1.2 ha vs. 2025" tone="ok"/>
        <KpiCard label="TRAITEMENTS / 30 J" value="42" unit="" trend="dont 38 conformes GLOBALG.A.P."/>
        <KpiCard label="STOCK PHYTO" value="74" unit="%" trend="2 alertes seuil minimal" tone="warn"/>
        <KpiCard label="CAPTEURS IOT" value="8/8" unit="" trend="dernier ping il y a 12 s" tone="ok"/>
      </div>

      <div className="dash-grid">
        {/* Mini map */}
        <div className="dash-card dash-map-card">
          <div className="dash-card-head">
            <div>
              <div className="mono dash-card-eyebrow">EXPLOITATION</div>
              <h3 className="dash-card-title">Vue d'ensemble · 6 parcelles</h3>
            </div>
            <button className="btn btn-tertiary" onClick={() => onNav("parcelles")}>Détails<window.IconChevR size={12}/></button>
          </div>
          <div className="dash-mini-map">
            <MiniMap/>
          </div>
        </div>

        {/* Alerts */}
        <div className="dash-card">
          <div className="dash-card-head">
            <div>
              <div className="mono dash-card-eyebrow">FLUX D'ALERTES</div>
              <h3 className="dash-card-title">3 actions requises</h3>
            </div>
            <span className="live-mini mono"><span className="live-dot"/>LIVE</span>
          </div>
          <div className="alert-list">
            <AlertItem tone="danger" time="14:28" title="Verger B05 · Olivier — alerte mildiou détectée" sub="Vision IA · score 0.87 · Hugging Face"/>
            <AlertItem tone="warn"   time="13:55" title="Stock cuivre — seuil minimal franchi (12 L)" sub="Fournisseur · Phytodis · réappro 48 h"/>
            <AlertItem tone="warn"   time="12:40" title="Vent prévu &gt; 19 km/h à 16:00 sur secteur Est" sub="Décaler traitement Verger A12"/>
            <AlertItem tone="info"   time="09:10" title="NDVI Sentinel · semaine 8 disponible" sub="Indice moyen 0.72 · +0.04 vs s7"/>
          </div>
        </div>

        {/* Treatments today */}
        <div className="dash-card">
          <div className="dash-card-head">
            <div>
              <div className="mono dash-card-eyebrow">PLANNING DU JOUR</div>
              <h3 className="dash-card-title">Traitements 24 fév.</h3>
            </div>
            <button className="btn btn-tertiary">Voir tout</button>
          </div>
          <table className="dash-table">
            <thead>
              <tr><th>PARC.</th><th>PRODUIT</th><th>OPÉRATEUR</th><th>FENÊTRE</th><th>STATUT</th></tr>
            </thead>
            <tbody>
              <tr><td className="mono">A13</td><td>Cuivre + Soufre</td><td>L. Mansour</td><td>14:00 — 14:50</td><td><span className="status-pill treating"><span className="dot"/>EN COURS</span></td></tr>
              <tr><td className="mono">A12</td><td>Bouillie bordelaise</td><td>K. Benali</td><td>16:00 — 17:00</td><td><span className="status-pill warn"><span className="dot"/>VENT</span></td></tr>
              <tr><td className="mono">D08</td><td>Insecticide bio</td><td>L. Mansour</td><td>18:30 — 19:30</td><td><span className="status-pill planned"><span className="dot"/>PLANIFIÉ</span></td></tr>
              <tr><td className="mono">C01</td><td>Engrais foliaire</td><td>S. Hadj</td><td>—</td><td><span className="status-pill done"><span className="dot"/>FAIT 11:20</span></td></tr>
            </tbody>
          </table>
        </div>

        {/* Weather strip */}
        <div className="dash-card">
          <div className="dash-card-head">
            <div>
              <div className="mono dash-card-eyebrow">FENÊTRES MÉTÉO · 5 JOURS</div>
              <h3 className="dash-card-title">Sidi Bel Abbès</h3>
            </div>
          </div>
          <div className="forecast-strip">
            {[
              ["MAR","22°","12","GO"],
              ["MER","24°","15","GO"],
              ["JEU","27°","22","NO"],
              ["VEN","25°","18","GO"],
              ["SAM","23°","10","GO"],
              ["DIM","21°","08","GO"],
              ["LUN","20°","11","GO"],
            ].map(([d,t,w,s],i) => (
              <div key={i} className={"forecast-cell " + (s === "NO" ? "is-no" : "is-go")}>
                <div className="fc-day mono">{d}</div>
                <div className="fc-temp">{t}</div>
                <div className="fc-wind mono">VENT {w}</div>
                <div className={"fc-badge mono " + (s === "NO" ? "no" : "go")}>{s === "NO" ? "STOP" : "GO"}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, unit, trend, tone }) {
  return (
    <div className="kpi-card">
      <div className="mono kpi-card-lbl">{label}</div>
      <div className="kpi-card-val">{value}<span className="kpi-card-unit">{unit && " " + unit}</span></div>
      <div className={"kpi-card-trend " + (tone || "")}>{trend}</div>
    </div>
  );
}

function AlertItem({ tone, time, title, sub }) {
  return (
    <div className={"alert-item alert-" + tone}>
      <div className="alert-time mono">{time}</div>
      <div className="alert-body">
        <div className="alert-title">{title}</div>
        <div className="alert-sub mono">{sub.toUpperCase()}</div>
      </div>
      <button className="btn btn-tertiary alert-btn">Voir<window.IconChevR size={12}/></button>
    </div>
  );
}

/* Mini map showing parcelle status as small abstract tiles */
function MiniMap() {
  return (
    <svg viewBox="0 0 600 240" preserveAspectRatio="xMidYMid meet" style={{width:"100%",height:"100%"}}>
      <defs>
        <pattern id="mini-grove" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="5" cy="5" r="0.8" fill="rgba(32,59,20,.25)"/>
        </pattern>
        <pattern id="mini-topo" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M 0 30 Q 15 15 30 30 T 60 30" stroke="rgba(32,59,20,0.06)" fill="none" strokeWidth="0.6"/>
        </pattern>
      </defs>
      <rect width="600" height="240" fill="#f5f8ec"/>
      <rect width="600" height="240" fill="url(#mini-topo)"/>

      <g>
        <path d="M40,50 L180,40 L210,140 L150,180 L70,160 Z" fill="rgba(32,59,20,.18)" stroke="#203b14" strokeWidth="1"/>
        <path d="M40,50 L180,40 L210,140 L150,180 L70,160 Z" fill="url(#mini-grove)"/>
        <text x="110" y="105" fontFamily="Inter" fontSize="11" fontWeight="600" fill="#0a1d08" textAnchor="middle">A12</text>

        <path d="M210,140 L320,130 L340,210 L240,220 Z" fill="rgba(74,50,18,.22)" stroke="#4a3212" strokeWidth="1.4"/>
        <path d="M210,140 L320,130 L340,210 L240,220 Z" fill="url(#mini-grove)"/>
        <text x="270" y="175" fontFamily="Inter" fontSize="11" fontWeight="600" fill="#0a1d08" textAnchor="middle">A13</text>

        <path d="M70,160 L150,180 L240,220 L180,230 L60,210 Z" fill="rgba(32,59,20,.16)" stroke="#203b14" strokeWidth="1"/>
        <path d="M70,160 L150,180 L240,220 L180,230 L60,210 Z" fill="url(#mini-grove)"/>
        <text x="140" y="205" fontFamily="Inter" fontSize="11" fontWeight="600" fill="#0a1d08" textAnchor="middle">B04</text>

        <path d="M240,220 L340,210 L380,170 L420,210 L380,230 Z" fill="rgba(107,31,10,.18)" stroke="#6b1f0a" strokeWidth="1.4"/>
        <path d="M240,220 L340,210 L380,170 L420,210 L380,230 Z" fill="url(#mini-grove)"/>
        <text x="340" y="215" fontFamily="Inter" fontSize="11" fontWeight="600" fill="#0a1d08" textAnchor="middle">B05</text>

        <path d="M340,210 L420,210 L520,170 L560,230 L440,230 Z" fill="rgba(32,59,20,.16)" stroke="#203b14" strokeWidth="1"/>
        <path d="M340,210 L420,210 L520,170 L560,230 L440,230 Z" fill="url(#mini-grove)"/>
        <text x="470" y="210" fontFamily="Inter" fontSize="11" fontWeight="600" fill="#0a1d08" textAnchor="middle">D08</text>

        <path d="M340,80 L460,60 L490,130 L380,150 Z" fill="rgba(32,59,20,.14)" stroke="#203b14" strokeWidth="1"/>
        <path d="M340,80 L460,60 L490,130 L380,150 Z" fill="url(#mini-grove)"/>
        <text x="415" y="110" fontFamily="Inter" fontSize="11" fontWeight="600" fill="#0a1d08" textAnchor="middle">C01</text>

        {/* tractor pulse on A13 */}
        <g>
          <circle cx="280" cy="170" r="10" fill="rgba(74,50,18,.2)">
            <animate attributeName="r" values="6;14;6" dur="2s" repeatCount="indefinite"/>
          </circle>
          <circle cx="280" cy="170" r="5" fill="#4a3212"/>
        </g>
      </g>

      {/* compass */}
      <g transform="translate(560,40)">
        <circle r="16" fill="rgba(251,253,246,.85)" stroke="#c5ccb6"/>
        <path d="M 0 -10 L 4 6 L 0 3 L -4 6 Z" fill="#203b14"/>
        <text y="-22" textAnchor="middle" fontFamily="Fragment Mono" fontSize="8" fill="#203b14" letterSpacing="2">N</text>
      </g>
    </svg>
  );
}

function ContourBadge() {
  return (
    <svg viewBox="0 0 320 240" style={{width:"100%",maxWidth:"320px"}}>
      <defs>
        <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbfdf6"/>
          <stop offset="1" stopColor="#e0e5d5"/>
        </linearGradient>
      </defs>
      <rect width="320" height="240" rx="12" fill="url(#hg)" stroke="#c5ccb6"/>
      {/* layered contours */}
      <g stroke="#203b14" fill="none" strokeWidth="1">
        <path d="M 30 200 Q 80 140 160 150 T 290 180" opacity="0.6"/>
        <path d="M 30 180 Q 80 120 160 130 T 290 160" opacity="0.5"/>
        <path d="M 30 160 Q 80 100 160 110 T 290 140" opacity="0.4"/>
        <path d="M 30 140 Q 80 80 160 90 T 290 120" opacity="0.3"/>
        <path d="M 30 120 Q 80 60 160 70 T 290 100" opacity="0.2"/>
      </g>
      {/* sun-disc */}
      <circle cx="240" cy="60" r="22" fill="#4a3212" opacity="0.85"/>
      <text x="20" y="30" fontFamily="Fragment Mono" fontSize="10" fill="#c5ccb6" letterSpacing="2">35°11'N · 0°37'W · ALT 482M</text>
    </svg>
  );
}

window.DashboardView = DashboardView;
