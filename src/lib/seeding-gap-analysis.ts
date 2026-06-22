export type GapInfo = {
  xStart: number;
  xEnd: number;
  nMissing: number;
};

export type AnalysisResult = {
  peaks: number[];
  gaps: GapInfo[];
  healthPct: number;
  nbDetected: number;
  nbMissing: number;
  medianSpacing: number;
  rowSpacingPx: number;
  confidence: number;
  annotatedUrl: string;
};

function findExtrema(profile: Float32Array, mean: number, minDist: number, findMin: boolean): number[] {
  const peaks: number[] = [];
  for (let x = 1; x < profile.length - 1; x++) {
    const isExtremum = findMin
      ? profile[x] <= profile[x - 1] && profile[x] <= profile[x + 1] && profile[x] < mean * 0.97
      : profile[x] >= profile[x - 1] && profile[x] >= profile[x + 1] && profile[x] > mean * 1.03;
    if (isExtremum && (!peaks.length || x - peaks[peaks.length - 1] >= minDist)) {
      peaks.push(x);
    }
  }
  return peaks;
}

export function analyzeGaps(file: File): Promise<AnalysisResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const W = Math.min(img.width, 800);
      const H = Math.round(img.height * (W / img.width));

      const src = document.createElement("canvas");
      src.width = W; src.height = H;
      const sctx = src.getContext("2d")!;
      sctx.drawImage(img, 0, 0, W, H);
      const imgData = sctx.getImageData(0, 0, W, H);

      // Grayscale column profile (luminance-weighted average per column)
      const profile = new Float32Array(W);
      for (let x = 0; x < W; x++) {
        let sum = 0;
        for (let y = 0; y < H; y++) {
          const i = (y * W + x) * 4;
          sum += 0.299 * imgData.data[i] + 0.587 * imgData.data[i + 1] + 0.114 * imgData.data[i + 2];
        }
        profile[x] = sum / H;
      }

      // Normalize to 0–255 so dark (night/NIR) and bright (RGB) images behave the same
      let pMin = profile[0], pMax = profile[0];
      for (let x = 1; x < W; x++) { if (profile[x] < pMin) pMin = profile[x]; if (profile[x] > pMax) pMax = profile[x]; }
      const pRange = pMax - pMin;
      if (pRange > 1) for (let x = 0; x < W; x++) profile[x] = (profile[x] - pMin) / pRange * 255;

      // Two-pass moving average — pass 2 reads pass 1 output, not raw profile
      const WIN = 8;
      const pass1 = new Float32Array(W);
      for (let x = 0; x < W; x++) {
        let s = 0, n = 0;
        for (let k = Math.max(0, x - WIN); k <= Math.min(W - 1, x + WIN); k++) { s += profile[k]; n++; }
        pass1[x] = s / n;
      }
      const smooth = new Float32Array(W);
      for (let x = 0; x < W; x++) {
        let s = 0, n = 0;
        for (let k = Math.max(0, x - WIN); k <= Math.min(W - 1, x + WIN); k++) { s += pass1[k]; n++; }
        smooth[x] = s / n;
      }

      const mean = smooth.reduce((a, b) => a + b, 0) / W;
      // Adaptive min distance: expect at least W/60 px between rows at the given zoom
      const MIN_DIST = Math.max(8, Math.round(W / 60));

      // Try dark rows first (green crops on bright soil); fall back to bright rows (NDVI images)
      let peaks = findExtrema(smooth, mean, MIN_DIST, true);
      if (peaks.length < 3) peaks = findExtrema(smooth, mean, MIN_DIST, false);
      if (peaks.length < 2) {
        reject(new Error("Pas assez de rangs détectés. Essayez une image avec des rangs plus visibles ou un zoom plus rapproché."));
        return;
      }

      const spacings = peaks.slice(1).map((p, i) => p - peaks[i]);
      const sorted = [...spacings].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];

      // Confidence: coefficient of variation of spacings (lower = more regular = more confident)
      const variance = spacings.reduce((s, sp) => s + (sp - median) ** 2, 0) / spacings.length;
      const cv = median > 0 ? Math.sqrt(variance) / median : 1;
      const confidence = Math.round(Math.max(0, Math.min(100, (1 - Math.min(cv * 1.5, 1)) * 100)));

      const gaps: GapInfo[] = [];
      for (let i = 0; i < spacings.length; i++) {
        if (spacings[i] > median * 1.5) {
          gaps.push({ xStart: peaks[i], xEnd: peaks[i + 1], nMissing: Math.max(1, Math.round(spacings[i] / median) - 1) });
        }
      }

      const nbMissing = gaps.reduce((s, g) => s + g.nMissing, 0);
      const nbExpected = peaks.length + nbMissing;
      const healthPct = nbExpected > 0 ? (peaks.length / nbExpected) * 100 : 100;

      // Build annotated output canvas
      const out = document.createElement("canvas");
      out.width = W; out.height = H;
      const octx = out.getContext("2d")!;
      octx.drawImage(src, 0, 0);

      // Green crop-row lines
      octx.strokeStyle = "rgba(0,220,100,0.8)"; octx.lineWidth = 1.5;
      for (const px of peaks) {
        octx.beginPath(); octx.moveTo(px, 0); octx.lineTo(px, H); octx.stroke();
      }

      // Red gap zones + dashed midlines + labels
      for (const { xStart, xEnd, nMissing: n } of gaps) {
        octx.fillStyle = "rgba(255,50,50,0.18)";
        octx.fillRect(xStart, 0, xEnd - xStart, H);
        const mid = (xStart + xEnd) / 2;
        octx.setLineDash([6, 6]); octx.strokeStyle = "rgba(255,80,80,0.9)"; octx.lineWidth = 2;
        octx.beginPath(); octx.moveTo(mid, 0); octx.lineTo(mid, H); octx.stroke();
        octx.setLineDash([]);
        const label = `${n} rang${n > 1 ? "s" : ""} manquant${n > 1 ? "s" : ""}`;
        const lw = octx.measureText(label).width + 10;
        octx.fillStyle = "rgba(0,0,0,0.65)"; octx.fillRect(xStart + 2, 4, lw, 20);
        octx.fillStyle = "#fff"; octx.font = "bold 11px monospace";
        octx.fillText(label, xStart + 5, 18);
      }

      // Health + confidence badge
      const badgeColor = healthPct >= 80 ? "#22c55e" : healthPct >= 60 ? "#f59e0b" : "#ef4444";
      const badge = `Santé: ${healthPct.toFixed(1)}%  |  ${peaks.length} rangs  |  confiance: ${confidence}%`;
      octx.fillStyle = "rgba(0,0,0,0.70)"; octx.fillRect(4, H - 28, Math.min(W - 8, octx.measureText(badge).width + 12), 24);
      octx.fillStyle = badgeColor; octx.font = "bold 11px monospace";
      octx.fillText(badge, 8, H - 11);

      resolve({ peaks, gaps, healthPct, nbDetected: peaks.length, nbMissing, medianSpacing: median, rowSpacingPx: median, confidence, annotatedUrl: out.toDataURL("image/png") });
    };

    img.onerror = () => reject(new Error("Impossible de charger l'image."));
    img.src = url;
  });
}
