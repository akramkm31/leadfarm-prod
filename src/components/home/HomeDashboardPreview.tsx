"use client";

export default function HomeDashboardPreview() {
  return (
    <div className="showcase-screen">
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" style={{ width: "100%", height: "100%", display: "block" }}>
        <defs>
          <pattern id="grove-d" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="5" cy="5" r="0.8" fill="rgba(32,59,20,.25)"/>
          </pattern>
          <pattern id="topo-d" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 0 30 Q 15 15 30 30 T 60 30" stroke="rgba(32,59,20,0.06)" fill="none" strokeWidth="0.6"/>
          </pattern>
        </defs>

        
        <rect width="240" height="900" fill="#fbfdf6"/>
        <line x1="240" y1="0" x2="240" y2="900" stroke="#e0e5d5"/>
        <circle cx="32" cy="48" r="6" fill="#203b14"/>
        <text x="48" y="54" fontFamily="Inter" fontSize="22" fontWeight="700" fill="#0a1d08" letterSpacing="-1">LeadFarm</text>
        <text x="22" y="100" fontFamily="Fragment Mono" fontSize="9" letterSpacing="2" fill="#c5ccb6">EXPLOITATION ACTIVE</text>
        <rect x="22" y="110" width="196" height="60" rx="8" fill="#f5f8ec" stroke="#e0e5d5"/>
        <text x="34" y="135" fontFamily="Inter" fontSize="14" fontWeight="600" fill="#0a1d08" letterSpacing="-0.4">Domaine Khelifa</text>
        <text x="34" y="155" fontFamily="Fragment Mono" fontSize="10" letterSpacing="1" fill="#203b14">SIDI BEL ABBÈS · 247 HA</text>

        <text x="34" y="200" fontFamily="Fragment Mono" fontSize="9" letterSpacing="2" fill="#c5ccb6">PILOTAGE</text>
        <g fontFamily="Inter" fontSize="14">
          <rect x="22" y="216" width="196" height="36" rx="18" fill="#d7e8b5"/>
          <text x="60" y="240" fill="#203b14" fontWeight="500">Tableau de bord</text>
          <text x="60" y="282" fill="#0a1d08">Carte &amp; Parcelles</text>
          <text x="60" y="324" fill="#0a1d08">Traitements</text>
          <text x="60" y="366" fill="#0a1d08">Registre &amp; PDF</text>
        </g>
        <text x="34" y="410" fontFamily="Fragment Mono" fontSize="9" letterSpacing="2" fill="#c5ccb6">OPÉRATIONS</text>
        <g fontFamily="Inter" fontSize="14" fill="#0a1d08">
          <text x="60" y="444">Stock &amp; Produits</text>
          <text x="60" y="486">Verger en direct</text>
          <text x="60" y="528">Satellite</text>
        </g>
        <text x="34" y="570" fontFamily="Fragment Mono" fontSize="9" letterSpacing="2" fill="#c5ccb6">AUDIT</text>
        <g fontFamily="Inter" fontSize="14" fill="#0a1d08">
          <text x="60" y="604">Conformité</text>
          <text x="60" y="646">Historique</text>
        </g>

        
        <line x1="22" y1="820" x2="218" y2="820" stroke="#e0e5d5"/>
        <circle cx="44" cy="852" r="16" fill="#4a3212"/>
        <text x="44" y="858" textAnchor="middle" fontFamily="Inter" fontSize="12" fontWeight="600" fill="#fbfdf6" letterSpacing="0.5">YK</text>
        <text x="70" y="848" fontFamily="Inter" fontSize="13" fill="#0a1d08" letterSpacing="-0.3">Yacine Khelifa</text>
        <text x="70" y="864" fontFamily="Fragment Mono" fontSize="9" fill="#c5ccb6" letterSpacing="1">CHEF D'EXPLOITATION</text>

        
        <rect x="240" y="0" width="1360" height="64" fill="#fbfdf6"/>
        <line x1="240" y1="64" x2="1600" y2="64" stroke="#e0e5d5"/>
        <text x="280" y="40" fontFamily="Fragment Mono" fontSize="11" letterSpacing="2" fill="#c5ccb6">LEADFARM › <tspan fill="#0a1d08">TABLEAU DE BORD</tspan></text>

        
        <rect x="1200" y="14" width="170" height="32" rx="16" fill="#fbfdf6" stroke="#e0e5d5"/>
        <circle cx="1218" cy="30" r="4" fill="#3d8b3d"/>
        <text x="1232" y="35" fontFamily="Fragment Mono" fontSize="10" letterSpacing="1" fill="#203b14">SYNC IL Y A 12 S</text>

        <rect x="1384" y="14" width="98" height="32" rx="16" fill="#fbfdf6" stroke="#e0e5d5"/>
        <text x="1402" y="35" fontFamily="Inter" fontSize="12" fill="#0a1d08" letterSpacing="-0.2">Alertes</text>
        <rect x="1450" y="22" width="22" height="16" rx="8" fill="#4a3212"/>
        <text x="1461" y="34" textAnchor="middle" fontFamily="Fragment Mono" fontSize="9" fill="#fbfdf6">3</text>

        
        <rect x="240" y="64" width="1360" height="836" fill="#fbfdf6"/>

        
        <text x="280" y="110" fontFamily="Fragment Mono" fontSize="11" letterSpacing="2" fill="#c5ccb6">BONJOUR · MARDI 24 FÉVRIER 2026 · 14:32</text>
        <text x="280" y="170" fontFamily="Inter" fontSize="38" fontWeight="700" fill="#0a1d08" letterSpacing="-1.5">8 traitements planifiés cette semaine.</text>
        <text x="280" y="216" fontFamily="Inter" fontSize="38" fontWeight="700" fill="#c5ccb6" letterSpacing="-1.5">3 fenêtres météo favorables.</text>

        
        <rect x="280" y="244" width="240" height="40" rx="20" fill="#4a3212"/>
        <text x="400" y="269" textAnchor="middle" fontFamily="Inter" fontSize="13" fill="#fbfdf6">+  Planifier un traitement</text>
        <rect x="530" y="244" width="170" height="40" rx="20" fill="#fbfdf6" stroke="#e0e5d5"/>
        <text x="615" y="269" textAnchor="middle" fontFamily="Inter" fontSize="13" fill="#203b14">Ouvrir la carte</text>
        <rect x="710" y="244" width="190" height="40" rx="20" fill="#fbfdf6" stroke="#e0e5d5"/>
        <text x="805" y="269" textAnchor="middle" fontFamily="Inter" fontSize="13" fill="#203b14">Registre du jour (PDF)</text>

        
        <g transform="translate(1240, 96)">
          <rect width="320" height="200" rx="10" fill="#f5f8ec" stroke="#c5ccb6"/>
          <g stroke="#203b14" fill="none" strokeWidth="1">
            <path d="M 30 170 Q 80 110 160 120 T 290 150" opacity="0.55"/>
            <path d="M 30 150 Q 80 90 160 100 T 290 130" opacity="0.45"/>
            <path d="M 30 130 Q 80 70 160 80 T 290 110" opacity="0.35"/>
            <path d="M 30 110 Q 80 50 160 60 T 290 90" opacity="0.25"/>
          </g>
          <circle cx="240" cy="50" r="20" fill="#4a3212" opacity="0.85"/>
          <text x="20" y="26" fontFamily="Fragment Mono" fontSize="9" fill="#c5ccb6" letterSpacing="2">35°11'N · 0°37'W · ALT 482M</text>
        </g>

        
        <g fontFamily="Inter">
          
          <rect x="280" y="320" width="306" height="110" rx="8" fill="#fbfdf6" stroke="#e0e5d5"/>
          <text x="300" y="346" fontFamily="Fragment Mono" fontSize="10" letterSpacing="2" fill="#c5ccb6">SURFACE TOTALE</text>
          <text x="300" y="392" fontSize="32" fontWeight="600" fill="#0a1d08" letterSpacing="-1.2">247.3 <tspan fontFamily="Fragment Mono" fontSize="13" fill="#c5ccb6">ha</tspan></text>
          <text x="300" y="416" fontSize="12" fill="#203b14">+1.2 ha vs. 2025</text>
          
          <rect x="600" y="320" width="306" height="110" rx="8" fill="#fbfdf6" stroke="#e0e5d5"/>
          <text x="620" y="346" fontFamily="Fragment Mono" fontSize="10" letterSpacing="2" fill="#c5ccb6">TRAITEMENTS / 30 J</text>
          <text x="620" y="392" fontSize="32" fontWeight="600" fill="#0a1d08" letterSpacing="-1.2">42</text>
          <text x="620" y="416" fontSize="12" fill="#203b14">dont 38 conformes GLOBALG.A.P.</text>
          
          <rect x="920" y="320" width="306" height="110" rx="8" fill="#fbfdf6" stroke="#e0e5d5"/>
          <text x="940" y="346" fontFamily="Fragment Mono" fontSize="10" letterSpacing="2" fill="#c5ccb6">STOCK PHYTO</text>
          <text x="940" y="392" fontSize="32" fontWeight="600" fill="#0a1d08" letterSpacing="-1.2">74 <tspan fontFamily="Fragment Mono" fontSize="13" fill="#c5ccb6">%</tspan></text>
          <text x="940" y="416" fontSize="12" fill="#7a4a1a">2 alertes seuil minimal</text>
          
          <rect x="1240" y="320" width="320" height="110" rx="8" fill="#fbfdf6" stroke="#e0e5d5"/>
          <text x="1260" y="346" fontFamily="Fragment Mono" fontSize="10" letterSpacing="2" fill="#c5ccb6">CAPTEURS VERGER</text>
          <text x="1260" y="392" fontSize="32" fontWeight="600" fill="#0a1d08" letterSpacing="-1.2">8/8</text>
          <text x="1260" y="416" fontSize="12" fill="#203b14">dernier ping il y a 12 s</text>
        </g>

        
        
        <rect x="280" y="456" width="760" height="424" rx="8" fill="#fbfdf6" stroke="#e0e5d5"/>
        <text x="300" y="486" fontFamily="Fragment Mono" fontSize="10" letterSpacing="2" fill="#c5ccb6">EXPLOITATION</text>
        <text x="300" y="514" fontFamily="Inter" fontSize="18" fontWeight="600" fill="#0a1d08" letterSpacing="-0.6">Vue d'ensemble · 6 parcelles</text>
        <rect x="930" y="478" width="92" height="32" rx="16" fill="#fbfdf6" stroke="#e0e5d5"/>
        <text x="976" y="499" textAnchor="middle" fontFamily="Inter" fontSize="12" fill="#203b14">Détails ›</text>

        
        <g transform="translate(300, 540)">
          <rect width="720" height="320" rx="6" fill="#f5f8ec" stroke="#e0e5d5"/>
          <rect width="720" height="320" rx="6" fill="url(#topo-d)"/>
          
          <path d="M48,60 L210,48 L246,164 L176,212 L84,192 Z" fill="rgba(32,59,20,.2)" stroke="#203b14" strokeWidth="1.2"/>
          <path d="M48,60 L210,48 L246,164 L176,212 L84,192 Z" fill="url(#grove-d)"/>
          <text x="132" y="128" textAnchor="middle" fontFamily="Inter" fontSize="11" fontWeight="600" fill="#0a1d08">A12</text>

          <path d="M246,164 L380,156 L408,260 L288,272 Z" fill="rgba(74,50,18,.24)" stroke="#4a3212" strokeWidth="1.6"/>
          <path d="M246,164 L380,156 L408,260 L288,272 Z" fill="url(#grove-d)" opacity=".7"/>
          <text x="324" y="216" textAnchor="middle" fontFamily="Inter" fontSize="11" fontWeight="600" fill="#0a1d08">A13</text>

          <path d="M84,192 L176,212 L288,272 L222,290 L72,254 Z" fill="rgba(32,59,20,.18)" stroke="#203b14" strokeWidth="1.2"/>
          <path d="M84,192 L176,212 L288,272 L222,290 L72,254 Z" fill="url(#grove-d)"/>
          <text x="168" y="252" textAnchor="middle" fontFamily="Inter" fontSize="11" fontWeight="600" fill="#0a1d08">B04</text>

          <path d="M288,272 L408,260 L456,212 L504,260 L456,288 Z" fill="rgba(107,31,10,.18)" stroke="#6b1f0a" strokeWidth="1.6"/>
          <path d="M288,272 L408,260 L456,212 L504,260 L456,288 Z" fill="url(#grove-d)"/>
          <text x="408" y="262" textAnchor="middle" fontFamily="Inter" fontSize="11" fontWeight="600" fill="#0a1d08">B05</text>

          <path d="M408,260 L504,260 L624,212 L672,288 L528,288 Z" fill="rgba(32,59,20,.16)" stroke="#203b14" strokeWidth="1.2"/>
          <path d="M408,260 L504,260 L624,212 L672,288 L528,288 Z" fill="url(#grove-d)"/>
          <text x="564" y="262" textAnchor="middle" fontFamily="Inter" fontSize="11" fontWeight="600" fill="#0a1d08">D08</text>

          <path d="M408,100 L552,76 L588,160 L456,180 Z" fill="rgba(32,59,20,.14)" stroke="#203b14" strokeWidth="1.2"/>
          <path d="M408,100 L552,76 L588,160 L456,180 Z" fill="url(#grove-d)"/>
          <text x="498" y="136" textAnchor="middle" fontFamily="Inter" fontSize="11" fontWeight="600" fill="#0a1d08">C01</text>

          
          <circle cx="336" cy="216" r="12" fill="rgba(74,50,18,.18)"/>
          <circle cx="336" cy="216" r="6" fill="#4a3212"/>

          
          <g transform="translate(672,48)">
            <circle r="18" fill="rgba(251,253,246,.9)" stroke="#c5ccb6"/>
            <path d="M 0 -11 L 4 7 L 0 4 L -4 7 Z" fill="#203b14"/>
            <text y="-24" textAnchor="middle" fontFamily="Fragment Mono" fontSize="8" fill="#203b14" letterSpacing="2">N</text>
          </g>
        </g>

        
        <rect x="1060" y="456" width="500" height="424" rx="8" fill="#fbfdf6" stroke="#e0e5d5"/>
        <text x="1080" y="486" fontFamily="Fragment Mono" fontSize="10" letterSpacing="2" fill="#c5ccb6">FLUX D'ALERTES</text>
        <text x="1080" y="514" fontFamily="Inter" fontSize="18" fontWeight="600" fill="#0a1d08" letterSpacing="-0.6">3 actions requises</text>
        <circle cx="1493" cy="498" r="4" fill="#3d8b3d"/>
        <text x="1505" y="503" fontFamily="Fragment Mono" fontSize="10" letterSpacing="1" fill="#203b14">LIVE</text>

        
        <g fontFamily="Inter">
          
          <rect x="1080" y="540" width="460" height="68" rx="6" fill="rgba(107,31,10,.04)" stroke="rgba(107,31,10,.4)"/>
          <text x="1098" y="566" fontFamily="Fragment Mono" fontSize="10" fill="#c5ccb6">14:28</text>
          <text x="1098" y="588" fontSize="13" fill="#0a1d08" letterSpacing="-0.3">Verger B05 · Olivier — alerte mildiou détectée</text>
          <text x="1098" y="602" fontFamily="Fragment Mono" fontSize="9" letterSpacing="1" fill="#c5ccb6">DÉTECTION AUTOMATIQUE · TRAITER SOUS 48 H</text>

          
          <rect x="1080" y="618" width="460" height="68" rx="6" fill="rgba(122,74,26,.05)" stroke="rgba(122,74,26,.4)"/>
          <text x="1098" y="644" fontFamily="Fragment Mono" fontSize="10" fill="#c5ccb6">13:55</text>
          <text x="1098" y="666" fontSize="13" fill="#0a1d08" letterSpacing="-0.3">Stock cuivre — seuil minimal franchi (12 L)</text>
          <text x="1098" y="680" fontFamily="Fragment Mono" fontSize="9" letterSpacing="1" fill="#c5ccb6">PHYTODIS · RÉAPPRO 48 H</text>

          
          <rect x="1080" y="696" width="460" height="68" rx="6" fill="rgba(122,74,26,.05)" stroke="rgba(122,74,26,.4)"/>
          <text x="1098" y="722" fontFamily="Fragment Mono" fontSize="10" fill="#c5ccb6">12:40</text>
          <text x="1098" y="744" fontSize="13" fill="#0a1d08" letterSpacing="-0.3">Vent prévu &gt; 19 km/h à 16:00 sur secteur Est</text>
          <text x="1098" y="758" fontFamily="Fragment Mono" fontSize="9" letterSpacing="1" fill="#c5ccb6">DÉCALER TRAITEMENT VERGER A12</text>

          
          <rect x="1080" y="774" width="460" height="68" rx="6" fill="#fbfdf6" stroke="#e0e5d5"/>
          <text x="1098" y="800" fontFamily="Fragment Mono" fontSize="10" fill="#c5ccb6">09:10</text>
          <text x="1098" y="822" fontSize="13" fill="#0a1d08" letterSpacing="-0.3">Nouvelle analyse satellite du verger disponible</text>
          <text x="1098" y="836" fontFamily="Fragment Mono" fontSize="9" letterSpacing="1" fill="#c5ccb6">VIGUEUR EN HAUSSE CETTE SEMAINE</text>
        </g>
      </svg>
    </div>
  );
}
