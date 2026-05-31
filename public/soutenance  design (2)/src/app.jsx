// Root app
const { useState } = React;

function App() {
  const [active, setActive] = useState("parcelles");
  const defaults = window.TWEAK_DEFAULTS;
  const [tweak, setTweak] = window.useTweaks(defaults);

  let screen, crumbs;
  switch (active) {
    case "dashboard":
      screen = <window.DashboardView onNav={setActive} tweak={tweak}/>;
      crumbs = ["LeadFarm", "Tableau de bord"];
      break;
    case "audit":
      screen = <window.AuditView/>;
      crumbs = ["LeadFarm", "Audit", "Journal SCD2"];
      break;
    case "parcelles":
    default:
      screen = <window.ParcellesView tweak={tweak}/>;
      crumbs = ["LeadFarm", "Carte & Parcelles", "Verger A13"];
  }

  const topbarRight = active === "parcelles" ? (
    <>
      <span className="live-pill"><span className="live-dot"/>FLUX REALTIME · Supabase</span>
      <button className="btn btn-tertiary"><window.IconSearch size={13}/>Rechercher</button>
      <button className="btn btn-tertiary"><window.IconDownload size={13}/>Ordre PDF</button>
      <button className="btn btn-primary"><window.IconPlus size={13}/>Nouvelle parcelle</button>
    </>
  ) : active === "dashboard" ? (
    <>
      <span className="live-pill"><span className="live-dot"/>SYNC il y a 12 s</span>
      <button className="btn btn-tertiary"><window.IconBell size={13}/>Alertes <span className="topbar-badge">3</span></button>
      <button className="btn btn-tertiary"><window.IconSearch size={13}/>Rechercher</button>
    </>
  ) : (
    <>
      <button className="btn btn-tertiary"><window.IconSearch size={13}/>Rechercher</button>
      <button className="btn btn-tertiary"><window.IconDownload size={13}/>Export complet</button>
    </>
  );

  return (
    <>
      <window.Sidebar active={active} onNav={setActive}/>
      <div className="main">
        <window.Topbar crumbs={crumbs} right={topbarRight}/>
        <div className="content">
          {screen}
        </div>
      </div>

      <window.TweaksPanel title="Tweaks">
        <window.TweakSection title="Accent map">
          <window.TweakRadio
            label="Météo"
            value={tweak.weatherMode}
            options={[{value:"GO",label:"GO"},{value:"NOGO",label:"NO-GO"}]}
            onChange={v => setTweak('weatherMode', v)}
          />
          <window.TweakToggle
            label="Boussole de cap"
            value={tweak.showCompass}
            onChange={v => setTweak('showCompass', v)}
          />
          <window.TweakToggle
            label="Strates SCD2 dans panneau"
            value={tweak.showStrataAudit}
            onChange={v => setTweak('showStrataAudit', v)}
          />
        </window.TweakSection>
      </window.TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
