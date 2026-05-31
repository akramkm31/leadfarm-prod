// /parcelles — geospatial + trajectory scrubber + telemetry + agro-weather
const { useState, useEffect, useMemo, useRef } = React;

/* ---------- demo data ---------- */
const PARCELLES = [
  { id: "P-A12", name: "Verger A12", surface: 12.4, culture: "Pommier · Gala", planted: 2018, status: "ok",   d: "M120,140 L320,120 L360,260 L280,360 L150,330 L90,240 Z" },
  { id: "P-A13", name: "Verger A13", surface:  8.1, culture: "Pommier · Golden", planted: 2019, status: "treat", d: "M360,260 L520,250 L560,380 L460,420 L380,400 Z" },
  { id: "P-B04", name: "Verger B04", surface: 15.7, culture: "Olivier · Chemlal", planted: 2012, status: "ok",   d: "M150,330 L280,360 L380,400 L320,500 L180,490 L90,420 Z" },
  { id: "P-B05", name: "Verger B05", surface:  6.2, culture: "Olivier · Sigoise", planted: 2014, status: "alert", d: "M380,400 L460,420 L520,520 L420,560 L340,520 L320,500 Z" },
  { id: "P-C01", name: "Pépinière C01", surface: 3.4, culture: "Plant · Pommier", planted: 2024, status: "ok",  d: "M520,250 L660,230 L700,340 L560,380 Z" },
  { id: "P-D08", name: "Verger D08", surface: 22.3, culture: "Amandier", planted: 2010, status: "ok", d: "M560,380 L700,340 L740,460 L680,540 L520,520 Z" },
];

const STATUS_COLOR = {
  ok:    { fill: "rgba(32,59,20,.18)", stroke: "#203b14" },
  treat: { fill: "rgba(74,50,18,.22)", stroke: "#4a3212" },
  alert: { fill: "rgba(107,31,10,.18)", stroke: "#6b1f0a" },
};

/* Tractor trajectory: a hand-crafted serpentine path covering Verger A13 */
const TRAJECTORY = (() => {
  // serpentine through P-A13 polygon
  const points = [];
  const rows = 7;
  const xL = 380, xR = 540, yT = 280, yB = 410;
  for (let r = 0; r < rows; r++) {
    const y = yT + (r / (rows - 1)) * (yB - yT);
    if (r % 2 === 0) { points.push([xL, y], [xR, y]); }
    else { points.push([xR, y], [xL, y]); }
  }
  return points;
})();

/* Convert trajectory to cumulative length for scrubber positioning */
function buildTrajectoryGeom(pts) {
  const segs = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i][0] - pts[i-1][0], dy = pts[i][1] - pts[i-1][1];
    const len = Math.hypot(dx, dy);
    segs.push({ a: pts[i-1], b: pts[i], len, start: total });
    total += len;
  }
  return { segs, total };
}
const TRAJ_GEOM = buildTrajectoryGeom(TRAJECTORY);

function pointAtT(t) {
  const target = t * TRAJ_GEOM.total;
  for (const s of TRAJ_GEOM.segs) {
    if (target <= s.start + s.len) {
      const k = (target - s.start) / s.len;
      const x = s.a[0] + (s.b[0] - s.a[0]) * k;
      const y = s.a[1] + (s.b[1] - s.a[1]) * k;
      const heading = Math.atan2(s.b[1] - s.a[1], s.b[0] - s.a[0]) * 180/Math.PI;
      return { x, y, heading };
    }
  }
  const last = TRAJ_GEOM.segs[TRAJ_GEOM.segs.length - 1];
  return { x: last.b[0], y: last.b[1], heading: 0 };
}

/* SCD2 demo history for selected parcel */
const HISTORY_A13 = [
  { v: 4, date: "2026-02-14", change: "Surface ajustée +0.3 ha (relevé GPS)", by: "Y. Khelifa", current: true },
  { v: 3, date: "2025-11-02", change: "Culture: greffage Golden Reinders",    by: "M. Berrahal" },
  { v: 2, date: "2024-09-18", change: "Densité: 1250 → 1380 arbres/ha",       by: "Y. Khelifa" },
  { v: 1, date: "2019-03-04", change: "Création parcelle initiale",            by: "Système" },
];

/* ---------- main view ---------- */
function ParcellesView({ tweak }) {
  const [selected, setSelected] = useState("P-A13");
  const [t, setT] = useState(0.58);
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef(null);

  // auto-play scrubber
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const tick = (now) => {
      const dt = (now - last) / 1000; last = now;
      setT(p => {
        const n = p + dt * 0.06;
        return n >= 1 ? 0 : n;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing]);

  const tractor = useMemo(() => pointAtT(t), [t]);
  const parcel = PARCELLES.find(p => p.id === selected);

  // Speed jitters slightly with t for realism
  const speed = 5.8 + Math.sin(t * 18) * 0.6;
  const flow = 14.2 + Math.cos(t * 14) * 1.1;
  const speedClass = speed < 4 ? "slow" : speed > 8 ? "fast" : "ok";

  return (
    <div className="parcelles-screen screen" data-screen-label="parcelles">
      <div className="parcelles-grid">
        {/* MAP */}
        <div className="map-pane">
          <ParcelMap
            parcelles={PARCELLES}
            selected={selected}
            onSelect={setSelected}
            tractor={tractor}
            showCompass={tweak.showCompass}
          />

          {/* Map overlays */}
          <div className="map-overlay-tl">
            <div className="map-legend">
              <div className="map-legend-title mono">LÉGENDE</div>
              <div className="map-legend-row"><span className="lg-sw" style={{background:STATUS_COLOR.ok.fill,borderColor:STATUS_COLOR.ok.stroke}}/>Conforme</div>
              <div className="map-legend-row"><span className="lg-sw" style={{background:STATUS_COLOR.treat.fill,borderColor:STATUS_COLOR.treat.stroke}}/>Traitement en cours</div>
              <div className="map-legend-row"><span className="lg-sw" style={{background:STATUS_COLOR.alert.fill,borderColor:STATUS_COLOR.alert.stroke}}/>Alerte agronomique</div>
            </div>
          </div>

          <div className="map-overlay-tr">
            <div className="map-toolset">
              <button className="map-tool active" title="Polygone"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="m12 3 8 5-3 11H7L4 8l8-5Z"/></svg></button>
              <button className="map-tool" title="Rectangle"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="4" y="6" width="16" height="12"/></svg></button>
              <button className="map-tool" title="Suivi GPS"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="10" r="3"/><path d="M12 21s-7-7-7-12a7 7 0 0 1 14 0c0 5-7 12-7 12Z"/></svg></button>
              <button className="map-tool" title="Couches"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/></svg></button>
            </div>
          </div>

          {/* Trajectory scrubber */}
          <TrajectoryScrubber
            t={t} onChange={setT}
            playing={playing} onPlay={() => setPlaying(p => !p)}
            speed={speed} speedClass={speedClass}
            flow={flow} heading={tractor.heading}
            showCompass={tweak.showCompass}
          />
        </div>

        {/* SIDE PANEL */}
        <ParcelPanel parcel={parcel} tweak={tweak} />
      </div>
    </div>
  );
}

/* ---------- Map SVG ---------- */
function ParcelMap({ parcelles, selected, onSelect, tractor, showCompass }) {
  return (
    <svg className="parcel-map" viewBox="0 40 800 580" preserveAspectRatio="xMidYMid slice">
      <defs>
        {/* contour lines pattern */}
        <pattern id="topo" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
          <path d="M 0 40 Q 20 20 40 40 T 80 40" stroke="rgba(32,59,20,0.06)" fill="none" strokeWidth="0.8"/>
          <path d="M 0 60 Q 20 40 40 60 T 80 60" stroke="rgba(32,59,20,0.04)" fill="none" strokeWidth="0.8"/>
          <path d="M 0 20 Q 20 0 40 20 T 80 20" stroke="rgba(32,59,20,0.04)" fill="none" strokeWidth="0.8"/>
        </pattern>
        <pattern id="grove" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="7" cy="7" r="1.2" fill="rgba(32,59,20,0.22)"/>
        </pattern>
        <filter id="glow"><feGaussianBlur stdDeviation="2"/></filter>
      </defs>

      {/* terrain */}
      <rect x="0" y="0" width="800" height="640" fill="#f5f8ec"/>
      <rect x="0" y="0" width="800" height="640" fill="url(#topo)"/>

      {/* roads */}
      <path d="M 0 480 Q 200 460 400 470 T 800 450" stroke="rgba(74,50,18,.35)" strokeWidth="3" fill="none" strokeDasharray="6 5"/>
      <path d="M 420 0 Q 430 200 380 400 T 360 640" stroke="rgba(74,50,18,.25)" strokeWidth="2" fill="none" strokeDasharray="4 4"/>

      {/* north arrow */}
      <g transform="translate(740, 80)">
        <circle r="22" fill="rgba(251,253,246,.85)" stroke="#c5ccb6"/>
        <path d="M 0 -14 L 5 8 L 0 4 L -5 8 Z" fill="#203b14"/>
        <text y="-30" textAnchor="middle" fontFamily="Fragment Mono, monospace" fontSize="9" fill="#203b14" letterSpacing="2">N</text>
      </g>

      {/* parcelles */}
      {parcelles.map(p => {
        const s = STATUS_COLOR[p.status];
        const isSel = p.id === selected;
        return (
          <g key={p.id} onClick={() => onSelect(p.id)} style={{cursor:"pointer"}}>
            <path d={p.d} fill={s.fill} stroke={s.stroke} strokeWidth={isSel ? 2.4 : 1.2}
                  strokeDasharray={isSel ? "none" : "none"}
                  style={{transition:"all .2s"}}/>
            {/* grove pattern overlay */}
            <path d={p.d} fill="url(#grove)" opacity={isSel ? 0.5 : 0.35}/>
            {/* parcel label */}
            <ParcelLabel d={p.d} id={p.id} name={p.name} surface={p.surface} selected={isSel}/>
          </g>
        );
      })}

      {/* Tractor trajectory (only on P-A13) */}
      <g>
        <polyline
          points={TRAJECTORY.map(p => p.join(",")).join(" ")}
          fill="none"
          stroke="#4a3212"
          strokeWidth="1.2"
          strokeDasharray="3 3"
          opacity="0.4"
        />
        {/* completed portion */}
        <CompletedPath t={(tractorTNorm())} tractor={tractor}/>
        {/* tractor marker */}
        <g transform={`translate(${tractor.x}, ${tractor.y})`}>
          <circle r="14" fill="rgba(74,50,18,.15)" filter="url(#glow)"/>
          <circle r="8" fill="#4a3212"/>
          <g transform={`rotate(${tractor.heading})`}>
            <path d="M 0 -5 L 4 4 L 0 2 L -4 4 Z" fill="#fbfdf6"/>
          </g>
        </g>
      </g>
    </svg>
  );

  function tractorTNorm() {
    // dummy — used to keep code stable
    return 0;
  }
}

/* Completed (already-traveled) portion of trajectory */
function CompletedPath({ tractor }) {
  // build progressive polyline ending at the tractor
  // find which segment we are on
  let acc = 0;
  const pts = [TRAJECTORY[0]];
  for (let i = 1; i < TRAJECTORY.length; i++) {
    const a = TRAJECTORY[i-1], b = TRAJECTORY[i];
    const dx = b[0]-a[0], dy = b[1]-a[1];
    const len = Math.hypot(dx, dy);
    // check if tractor is on this segment
    const tx = tractor.x, ty = tractor.y;
    const ax = tx - a[0], ay = ty - a[1];
    const proj = (ax*dx + ay*dy) / (len*len);
    if (proj >= 0 && proj <= 1.001) {
      pts.push([a[0] + dx*proj, a[1] + dy*proj]);
      break;
    }
    pts.push(b);
    acc += len;
  }
  return (
    <polyline
      points={pts.map(p => p.join(",")).join(" ")}
      fill="none"
      stroke="#4a3212"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
  );
}

function ParcelLabel({ d, id, name, surface, selected }) {
  // compute centroid from path
  const m = useMemo(() => {
    const nums = d.match(/-?\d+(\.\d+)?/g).map(Number);
    let sx = 0, sy = 0, n = 0;
    for (let i = 0; i < nums.length; i += 2) { sx += nums[i]; sy += nums[i+1]; n++; }
    return { x: sx/n, y: sy/n };
  }, [d]);
  return (
    <g transform={`translate(${m.x}, ${m.y})`} pointerEvents="none">
      <text textAnchor="middle" y="-2" fontFamily="Inter, sans-serif" fontSize={selected ? 13 : 11} fontWeight={selected ? 600 : 500} fill="#0a1d08" letterSpacing="-0.02em">{name}</text>
      <text textAnchor="middle" y="12" fontFamily="Fragment Mono, monospace" fontSize="9" fill="#4a3212" letterSpacing="0.06em">{id} · {surface} ha</text>
    </g>
  );
}

/* ---------- Trajectory scrubber ---------- */
function TrajectoryScrubber({ t, onChange, playing, onPlay, speed, speedClass, flow, heading, showCompass }) {
  return (
    <div className="scrubber">
      <div className="scrubber-row1">
        <button className="scrub-btn" onClick={onPlay} aria-label={playing ? "Pause" : "Play"}>
          {playing ? <window.IconPause size={14}/> : <window.IconPlay size={14}/>}
        </button>

        <div className="scrub-time">
          <div className="scrub-time-label mono">EN COURS · VERGER A13</div>
          <div className="scrub-time-clock mono">14:32:{String(Math.floor(t * 59)).padStart(2,'0')} · J 247/365</div>
        </div>

        <div className="scrub-telemetry">
          {showCompass && (
            <div className="tele-cell">
              <div className="tele-label mono">CAP</div>
              <div className="compass">
                <div className="compass-ring"></div>
                <div className="compass-arrow" style={{transform:`rotate(${heading}deg)`}}>
                  <svg width="28" height="28" viewBox="0 0 28 28"><path d="M 14 4 L 18 18 L 14 15 L 10 18 Z" fill="#203b14"/></svg>
                </div>
                <span className="compass-deg mono">{Math.round((heading + 360) % 360)}°</span>
              </div>
            </div>
          )}
          <div className="tele-cell">
            <div className="tele-label mono">VITESSE</div>
            <div className={`tele-val speed-${speedClass}`}>{speed.toFixed(1)}<span className="tele-unit"> km/h</span></div>
            <div className="tele-bar"><span className={`tele-bar-fill speed-${speedClass}`} style={{width: `${Math.min(100, speed*10)}%`}}></span></div>
          </div>
          <div className="tele-cell">
            <div className="tele-label mono">DÉBIT</div>
            <div className="tele-val">{flow.toFixed(1)}<span className="tele-unit"> L/min</span></div>
            <div className="tele-bar"><span className="tele-bar-fill" style={{width: `${Math.min(100, flow*5)}%`,background:'#203b14'}}></span></div>
          </div>
        </div>
      </div>

      <div className="scrubber-row2">
        <span className="scrub-edge mono">08:14</span>
        <div className="scrub-track-wrap">
          <input
            className="scrub-track"
            type="range"
            min="0" max="1000"
            value={Math.round(t * 1000)}
            onChange={e => onChange(Number(e.target.value)/1000)}
          />
          <div className="scrub-track-fill" style={{width: `${t*100}%`}}></div>
          {/* tick stops representing rows */}
          {[0,1,2,3,4,5,6,7,8,9,10].map(i => (
            <span key={i} className="scrub-tick" style={{left: `${i*10}%`}}></span>
          ))}
        </div>
        <span className="scrub-edge mono">14:32</span>
      </div>
    </div>
  );
}

/* ---------- Side panel ---------- */
function ParcelPanel({ parcel, tweak }) {
  if (!parcel) return null;
  const isSelTreated = parcel.id === "P-A13";
  return (
    <aside className="parcel-panel scroll-y">
      <div className="panel-head">
        <div>
          <div className="mono panel-eyebrow">PARCELLE · {parcel.id}</div>
          <h2 className="panel-title">{parcel.name}</h2>
          <div className="panel-sub mono">{parcel.culture.toUpperCase()} · PLANTÉ {parcel.planted}</div>
        </div>
        <button className="panel-close" aria-label="Fermer"><window.IconClose size={16}/></button>
      </div>

      {/* KPI row */}
      <div className="panel-kpi">
        <div className="kpi-cell">
          <div className="kpi-val">{parcel.surface}<span className="kpi-unit"> ha</span></div>
          <div className="kpi-lbl mono">SURFACE</div>
        </div>
        <div className="kpi-cell">
          <div className="kpi-val">1 380<span className="kpi-unit"> /ha</span></div>
          <div className="kpi-lbl mono">DENSITÉ</div>
        </div>
        <div className="kpi-cell">
          <div className="kpi-val">v4</div>
          <div className="kpi-lbl mono">VERSION SCD2</div>
        </div>
      </div>

      {/* Weather + agro */}
      <AgroWeather mode={tweak.weatherMode}/>

      {/* current treatment */}
      {isSelTreated && (
        <div className="panel-section">
          <div className="panel-section-head">
            <span className="mono panel-section-eyebrow">TRAITEMENT EN COURS</span>
            <span className="status-pill treating"><span className="dot"/>EN COURS</span>
          </div>
          <div className="treat-card">
            <div className="treat-card-grid">
              <div>
                <div className="treat-lbl mono">PRODUIT</div>
                <div className="treat-val">Cuivre + Soufre</div>
                <div className="treat-meta mono">DOSE · 2.5 L/ha · BOUILLIE 800 L</div>
              </div>
              <div>
                <div className="treat-lbl mono">OPÉRATEUR</div>
                <div className="treat-val">L. Mansour</div>
                <div className="treat-meta mono">EPI · COMBINAISON CAT III</div>
              </div>
              <div>
                <div className="treat-lbl mono">FENÊTRE</div>
                <div className="treat-val">DAR 21 j</div>
                <div className="treat-meta mono">RÉCOLTE · 09 MAR 26</div>
              </div>
              <div>
                <div className="treat-lbl mono">PROGRÈS</div>
                <div className="treat-val" style={{color:"var(--color-valley-green)"}}>58%</div>
                <div className="treat-meta mono">≈ 17 MIN RESTANTES</div>
              </div>
            </div>
            <div className="treat-actions">
              <button className="btn btn-tertiary"><window.IconDownload size={13}/>FOR.PR6.003</button>
              <button className="btn btn-tertiary"><window.IconSignature size={13}/>Signer le registre</button>
            </div>
          </div>
        </div>
      )}

      {/* SCD2 strata */}
      {tweak.showStrataAudit && (
        <div className="panel-section">
          <div className="panel-section-head">
            <span className="mono panel-section-eyebrow">HISTORIQUE SCD2 · CAROTTE</span>
            <span className="mono panel-section-meta">{HISTORY_A13.length} VERSIONS</span>
          </div>
          <Strata items={HISTORY_A13}/>
        </div>
      )}

      <div className="panel-section">
        <div className="panel-section-head">
          <span className="mono panel-section-eyebrow">CAPTEURS IOT · 3 ACTIFS</span>
          <span className="live-mini mono"><span className="live-dot"/>LIVE</span>
        </div>
        <div className="sensor-grid">
          <Sensor label="Sol · 30 cm" value="14.2°" sub="Humidité 38%"/>
          <Sensor label="Air · canopée" value="22.8°" sub="HR 54%"/>
          <Sensor label="Pluvio · totalisé" value="4.2 mm" sub="Dernières 24 h"/>
        </div>
      </div>
    </aside>
  );
}

function Sensor({ label, value, sub }) {
  return (
    <div className="sensor-card">
      <div className="sensor-lbl mono">{label.toUpperCase()}</div>
      <div className="sensor-val">{value}</div>
      <div className="sensor-sub mono">{sub.toUpperCase()}</div>
    </div>
  );
}

/* ---------- Agro-weather: GO / NO-GO card ---------- */
function AgroWeather({ mode }) {
  const wind = mode === "NOGO" ? 23 : 12;
  const temp = mode === "NOGO" ? 31 : 22;
  const hum = mode === "NOGO" ? 38 : 64;
  const status = mode === "NOGO" ? "STOP" : "GO";
  const reason = mode === "NOGO"
    ? "Vent > 19 km/h · Température > 28°C — dérive et phytotoxicité"
    : "Conditions favorables au traitement phytosanitaire";

  return (
    <div className={"agro-weather " + (status === "STOP" ? "is-stop" : "is-go")}>
      <div className="agro-status">
        <div className="agro-status-icon">
          {status === "STOP" ? <window.IconAlert size={20}/> : <window.IconCheck size={20}/>}
        </div>
        <div>
          <div className="agro-status-label mono">CONTRÔLE AGRO-MÉTÉO</div>
          <div className="agro-status-headline">{status === "STOP" ? "Traitement interdit" : "Conditions favorables"}</div>
          <div className="agro-status-reason">{reason}</div>
        </div>
        <div className="agro-status-badge mono">{status}</div>
      </div>
      <div className="agro-metrics">
        <AgroMetric icon={<window.IconWind size={14}/>} label="VENT" value={wind} unit="km/h" max={30} threshold={19}/>
        <AgroMetric icon={<window.IconThermo size={14}/>} label="TEMP" value={temp} unit="°C" max={40} threshold={28}/>
        <AgroMetric icon={<window.IconDrop size={14}/>} label="HUMIDITÉ" value={hum} unit="%" max={100} threshold={null}/>
      </div>
    </div>
  );
}

function AgroMetric({ icon, label, value, unit, max, threshold }) {
  const pct = (value / max) * 100;
  const over = threshold !== null && value > threshold;
  return (
    <div className="agro-metric">
      <div className="agro-metric-head">
        <span className="agro-metric-icon">{icon}</span>
        <span className="agro-metric-lbl mono">{label}</span>
      </div>
      <div className={"agro-metric-val" + (over ? " over" : "")}>{value}<span className="agro-metric-unit"> {unit}</span></div>
      <div className="agro-metric-bar">
        <span className="agro-metric-bar-fill" style={{width:`${pct}%`,background: over ? "var(--c-danger)" : "var(--color-valley-green)"}}/>
        {threshold && <span className="agro-metric-threshold" style={{left:`${(threshold/max)*100}%`}}/>}
      </div>
    </div>
  );
}

/* ---------- Strata (geological core SCD2 visualization) ---------- */
function Strata({ items }) {
  const layerColors = ["#203b14","#3a5a26","#7a4a1a","#a07a3a"];
  return (
    <div className="strata">
      {items.map((it, i) => (
        <div key={i} className={"strata-row" + (it.current ? " is-current" : "")}>
          <div className="strata-layer" style={{background:layerColors[i % layerColors.length]}}>
            <span className="mono">v{it.v}</span>
          </div>
          <div className="strata-body">
            <div className="strata-date mono">{it.date}{it.current && <span className="strata-now"> · ACTUELLE</span>}</div>
            <div className="strata-change">{it.change}</div>
            <div className="strata-by mono">PAR {it.by.toUpperCase()}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

window.ParcellesView = ParcellesView;
