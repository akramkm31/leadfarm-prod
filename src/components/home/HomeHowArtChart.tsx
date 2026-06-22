"use client";

export default function HomeHowArtChart() {
  return (
    <div className="how-art">
      <svg viewBox="0 0 520 480" style={{ width: "100%", height: "100%" }}>
        <defs>
            <pattern id="dotgrid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1" fill="#c5ccb6" opacity=".4"/>
            </pattern>
          </defs>
          <rect width="520" height="480" fill="url(#dotgrid)"/>

          
          <g transform="translate(40, 30)">
            <rect width="200" height="80" rx="6" fill="#fbfdf6" stroke="#203b14"/>
            <text x="20" y="28" fontFamily="Fragment Mono" fontSize="9" letterSpacing="2" fill="#c5ccb6">01 · PARCELLE</text>
            <text x="20" y="52" fontFamily="Inter" fontSize="16" fontWeight="600" fill="#0a1d08" letterSpacing="-0.4">Verger A13 · 8.1 ha</text>
            <text x="20" y="70" fontFamily="Fragment Mono" fontSize="10" fill="#203b14" letterSpacing="1">SURFACE CALCULÉE AUTO.</text>
          </g>

          
          <path d="M 140 110 L 140 150" stroke="#c5ccb6" strokeWidth="1.4" markerEnd="url(#arr)"/>

          <g transform="translate(40, 160)">
            <rect width="200" height="80" rx="6" fill="#fbfdf6" stroke="#4a3212"/>
            <text x="20" y="28" fontFamily="Fragment Mono" fontSize="9" letterSpacing="2" fill="#c5ccb6">02 · TRAITEMENT</text>
            <text x="20" y="52" fontFamily="Inter" fontSize="16" fontWeight="600" fill="#0a1d08" letterSpacing="-0.4">Cuivre · 2.5 L/ha</text>
            <text x="20" y="70" fontFamily="Fragment Mono" fontSize="10" fill="#4a3212" letterSpacing="1">DOSE VALIDÉE · STOCK OK</text>
          </g>

          <path d="M 140 240 L 140 280" stroke="#c5ccb6" strokeWidth="1.4" markerEnd="url(#arr)"/>

          <g transform="translate(40, 290)">
            <rect width="200" height="80" rx="6" fill="#fbfdf6" stroke="#203b14"/>
            <text x="20" y="28" fontFamily="Fragment Mono" fontSize="9" letterSpacing="2" fill="#c5ccb6">03 · PULVÉRISATION</text>
            <text x="20" y="52" fontFamily="Inter" fontSize="16" fontWeight="600" fill="#0a1d08" letterSpacing="-0.4">L. Mansour · 14:32</text>
            <text x="20" y="70" fontFamily="Fragment Mono" fontSize="10" fill="#203b14" letterSpacing="1">VENT 12 KM/H · GO</text>
          </g>

          <path d="M 140 370 L 140 410" stroke="#c5ccb6" strokeWidth="1.4" markerEnd="url(#arr)"/>

          <g transform="translate(40, 420)">
            <rect width="200" height="40" rx="6" fill="#4a3212"/>
            <text x="20" y="26" fontFamily="Inter" fontSize="14" fontWeight="600" fill="#fbfdf6" letterSpacing="-0.3">Registre officiel signé</text>
          </g>

          
          <g transform="translate(310, 30)">
            <text x="0" y="-8" fontFamily="Fragment Mono" fontSize="9" letterSpacing="2" fill="#c5ccb6">TOUT L'HISTORIQUE CONSERVÉ</text>
            <rect width="180" height="36" rx="3" fill="#203b14"/><text x="14" y="22" fontFamily="Fragment Mono" fontSize="11" fill="#fbfdf6">14 FÉV. 2026</text>
            <rect y="40" width="180" height="36" rx="3" fill="#3a5a26"/><text x="14" y="62" fontFamily="Fragment Mono" fontSize="11" fill="#fbfdf6">02 NOV. 2025</text>
            <rect y="80" width="180" height="36" rx="3" fill="#7a4a1a"/><text x="14" y="102" fontFamily="Fragment Mono" fontSize="11" fill="#fbfdf6">18 SEPT. 2024</text>
            <rect y="120" width="180" height="36" rx="3" fill="#a07a3a"/><text x="14" y="142" fontFamily="Fragment Mono" fontSize="11" fill="#fbfdf6">04 MARS 2019</text>

            <text x="0" y="200" fontFamily="Fragment Mono" fontSize="9" letterSpacing="2" fill="#c5ccb6">CHAQUE DÉCISION HORODATÉE</text>
            <rect y="210" width="180" height="120" rx="3" fill="#0a1d08"/>
            <text x="14" y="238" fontFamily="Inter" fontSize="13" fontWeight="600" fill="#d7e8b5">Surface mise à jour</text>
            <text x="14" y="262" fontFamily="Fragment Mono" fontSize="10" fill="#fbfdf6">8.1 ha → 8.4 ha</text>
            <text x="14" y="290" fontFamily="Fragment Mono" fontSize="9" fill="#c5ccb6">↳ ancienne valeur gardée</text>
            <text x="14" y="306" fontFamily="Fragment Mono" fontSize="9" fill="#c5ccb6">↳ auteur &amp; date notés</text>
            <text x="14" y="322" fontFamily="Fragment Mono" fontSize="9" fill="#d7e8b5">↳ enregistré</text>

            <text x="0" y="370" fontFamily="Fragment Mono" fontSize="9" letterSpacing="2" fill="#c5ccb6">RIEN NE S'EFFACE JAMAIS</text>
            <rect y="380" width="180" height="36" rx="3" fill="#fbfdf6" stroke="#6b1f0a"/>
            <text x="14" y="402" fontFamily="Fragment Mono" fontSize="10" fill="#6b1f0a">HISTORIQUE INALTÉRABLE</text>
          </g>

          <defs>
            <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#c5ccb6"/>
            </marker>
          </defs>
      </svg>
    </div>
  );
}
