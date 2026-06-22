const HF_API_URL =
  "https://api-inference.huggingface.co/models/SerdarHelli/plant-village-disease-classification";

export type VisionPrediction = { label: string; score: number };

export type VisionAnalyzeResult = {
  label: string;
  confidence: number;
  predictions: VisionPrediction[];
  features: Record<string, unknown>;
  modelVersion: string;
  source: "huggingface" | "demo";
};

function parseBase64Image(imageBase64: string): Uint8Array {
  const base64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

function normalizeLabel(raw: string): string {
  return raw.split("__").pop()?.replace(/_/g, " ") || raw;
}

function demoResult(): VisionAnalyzeResult {
  const diseases = ["Tavelure du pommier", "Cochenille blanche", "Boufarou", "Alternaria", "Sain"];
  const label = diseases[Math.floor(Math.random() * diseases.length)];
  const confidence = label === "Sain" ? 0.92 : 0.78 + Math.random() * 0.15;
  return {
    label,
    confidence,
    predictions: [{ label, score: confidence }],
    features: { spot_count: 3, color_distribution: "green-yellow" },
    modelVersion: "leadfarm-demo-v1",
    source: "demo",
  };
}

export async function analyzePlantImage(imageBase64: string): Promise<VisionAnalyzeResult> {
  const token = process.env.HUGGINGFACE_API_TOKEN;
  if (!token) return demoResult();

  const binary = parseBase64Image(imageBase64);
  const res = await fetch(HF_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
    },
    body: binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength) as ArrayBuffer,
  });

  if (res.status === 503) {
    const body = await res.json().catch(() => ({}));
    if (body.error === "Model is loading") {
      throw new Error("Le modèle IA démarre. Réessayez dans 30 secondes.");
    }
  }

  if (!res.ok) {
    console.warn("[vision/analyze] HF error", res.status);
    return demoResult();
  }

  const predictions = (await res.json()) as Array<{ label: string; score: number }>;
  const top = predictions[0];
  if (!top) return demoResult();

  const label = normalizeLabel(top.label);
  const mapped: VisionPrediction[] = predictions.slice(0, 5).map((p) => ({
    label: normalizeLabel(p.label),
    score: p.score,
  }));

  return {
    label,
    confidence: top.score,
    predictions: mapped,
    features: { top_class: top.label },
    modelVersion: "plant-village-hf",
    source: "huggingface",
  };
}
