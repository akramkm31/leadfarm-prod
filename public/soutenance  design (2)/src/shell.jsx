// Sidebar + Topbar shell

const NAV = [
  { id: "dashboard", label: "Tableau de bord", Icon: window.IconDashboard, group: "PILOTAGE" },
  { id: "parcelles", label: "Carte & Parcelles", Icon: window.IconMap, group: "PILOTAGE", badge: "12" },
  { id: "treatments", label: "Traitements", Icon: window.IconSpray, group: "PILOTAGE" },
  { id: "registre", label: "Registre & PDF", Icon: window.IconSignature, group: "PILOTAGE" },
  { id: "stock", label: "Stock & Produits", Icon: window.IconBox, group: "OPÉRATIONS" },
  { id: "live", label: "IoT Live", Icon: window.IconWifi, group: "OPÉRATIONS", badge: "8" },
  { id: "satellite", label: "Satellite & Vision", Icon: window.IconSatellite, group: "OPÉRATIONS" },
  { id: "conformite", label: "Conformité", Icon: window.IconShield, group: "AUDIT" },
  { id: "audit", label: "Journal SCD2", Icon: window.IconLayers, group: "AUDIT" },
];

function Sidebar({ active, onNav }) {
  const groups = [];
  let last = null;
  for (const n of NAV) {
    if (n.group !== last) { groups.push({ name: n.group, items: [] }); last = n.group; }
    groups[groups.length - 1].items.push(n);
  }

  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <div className="word"><span className="dot"></span>LeadFarm</div>
        <div className="sub">v 1.4 · build 16-02-26</div>
      </div>

      <div className="sb-tenant">
        <span className="lbl">Exploitation active</span>
        <span className="nm">Domaine Khelifa</span>
        <span className="loc">SIDI BEL ABBÈS · 247 HA</span>
      </div>

      {groups.map(g => (
        <div key={g.name}>
          <div className="sb-group-label">{g.name}</div>
          {g.items.map(item => {
            const I = item.Icon;
            return (
              <div
                key={item.id}
                className={"sb-link" + (active === item.id ? " active" : "")}
                onClick={() => onNav(item.id)}
              >
                <I/>
                <span>{item.label}</span>
                {item.badge && <span className="badge">{item.badge}</span>}
              </div>
            );
          })}
        </div>
      ))}

      <div className="sb-user">
        <div className="sb-avatar">YK</div>
        <div style={{display:"flex",flexDirection:"column",gap:2}}>
          <span className="nm">Yacine Khelifa</span>
          <span className="ro">CHEF D'EXPLOITATION</span>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ crumbs, right }) {
  return (
    <div className="topbar">
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            <span className={i === crumbs.length - 1 ? "now" : ""}>{c}</span>
            {i < crumbs.length - 1 && <span>›</span>}
          </React.Fragment>
        ))}
      </div>
      <div className="topbar-right">
        {right}
      </div>
    </div>
  );
}

Object.assign(window, { Sidebar, Topbar, NAV });
