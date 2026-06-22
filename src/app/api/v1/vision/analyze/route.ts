import { NextRequest } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { withAuthRbac, validateBody, json, requireFeature } from "@/lib/api-helpers";
import path from "path";
import fs from "fs";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const bodySchema = z.object({
  image_base64: z.string().min(100, "Image requise"),
});

const APPLE_GATE_PROMPT = `Réponds avec un seul mot : OUI ou NON.

Quelle plante est représentée dans cette image ? Si et seulement si c'est une feuille de POMMIER (Malus domestica, arbre fruitier qui produit des pommes), réponds OUI.

NON obligatoire si : vigne, tomate, cerise, poivron, poire, pêche, prune, agrumes, blé, maïs, herbe, fleur, cactus, plante d'intérieur, légume, arbre non-fruitier, animal, personne, objet, paysage, photo floue, dessin, texte, interface, bâtiment.
NON si tu n'es pas certain à 100% que c'est un pommier.

Un seul mot en réponse.`;

const CLASS_MAP_4: Record<number, { label: string; labelFr: string }> = {
  0: { label: "Apple Scab",       labelFr: "Tavelure" },
  1: { label: "Apple Black Rot",  labelFr: "Pourriture noire" },
  2: { label: "Cedar Apple Rust", labelFr: "Rouille" },
  3: { label: "Healthy",          labelFr: "Sain" },
};

const CLASS_MAP_5: Record<number, { label: string; labelFr: string }> = {
  0: { label: "Apple Scab",       labelFr: "Tavelure" },
  1: { label: "Apple Rust",       labelFr: "Rouille" },
  2: { label: "Powdery Mildew",   labelFr: "Oïdium" },
  3: { label: "Apple Black Rot",  labelFr: "Pourriture noire" },
  4: { label: "Healthy",          labelFr: "Sain" },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _session: any = null;

async function getSession() {
  if (_session) return _session;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ort = require("onnxruntime-node");
  const modelPath = process.env.APPLE_DISEASE_MODEL_PATH
    ?? path.join(process.cwd(), "models", "apple-disease.onnx");
  if (!fs.existsSync(modelPath)) throw new Error(`Modèle ONNX introuvable : ${modelPath}`);
  _session = await ort.InferenceSession.create(modelPath);
  return _session;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runOnnx(session: any, buf: Buffer): Promise<{ data: Float32Array; dims: number[] }> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ort   = require("onnxruntime-node");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sharp = require("sharp");
  const inputSize = Number(process.env.APPLE_DISEASE_INPUT_SIZE ?? 640);
  const { data } = await sharp(buf).resize(inputSize, inputSize, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const float32 = new Float32Array(3 * inputSize * inputSize);
  for (let i = 0; i < inputSize * inputSize; i++) {
    float32[i]                             = data[i * 3]     / 255;
    float32[inputSize * inputSize + i]     = data[i * 3 + 1] / 255;
    float32[2 * inputSize * inputSize + i] = data[i * 3 + 2] / 255;
  }
  const tensor = new ort.Tensor("float32", float32, [1, 3, inputSize, inputSize]);
  const out = await session.run({ [session.inputNames[0]]: tensor });
  const outTensor = out[session.outputNames[0]];
  return { data: outTensor.data as Float32Array, dims: Array.from(outTensor.dims as number[]) };
}

function softmax(arr: number[]): number[] {
  const max = Math.max(...arr);
  const exps = arr.map(x => Math.exp(x - max));
  const sum  = exps.reduce((a, b) => a + b, 0);
  return exps.map(x => x / sum);
}

// For classification models: output shape [1, nc]
function classifyDirect(raw: Float32Array): { classIdx: number; confidence: number; probs: number[] } {
  const probs = softmax(Array.from(raw));
  let maxIdx = 0, maxVal = probs[0];
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > maxVal) { maxVal = probs[i]; maxIdx = i; }
  }
  return { classIdx: maxIdx, confidence: maxVal, probs };
}

// For detection models: output shape [1, 4+nc, numAnchors]
// Max-pool class logits across all anchors, then softmax for per-class probability
function classifyDetection(raw: Float32Array, numAnchors: number, nc: number): { classIdx: number; confidence: number; probs: number[] } {
  const maxLogits: number[] = Array(nc).fill(-Infinity);
  for (let c = 0; c < nc; c++) {
    const offset = (4 + c) * numAnchors;
    for (let i = 0; i < numAnchors; i++) {
      if (raw[offset + i] > maxLogits[c]) maxLogits[c] = raw[offset + i];
    }
  }
  const probs = softmax(maxLogits);
  let maxIdx = 0, best = probs[0];
  for (let i = 1; i < nc; i++) { if (probs[i] > best) { best = probs[i]; maxIdx = i; } }
  return { classIdx: maxIdx, confidence: best, probs };
}

export async function POST(req: NextRequest) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;
  const denied = requireFeature(auth, "vision");
  if (denied) return denied;

  if (!process.env.ANTHROPIC_API_KEY)
    return json({ success: false, error: "ANTHROPIC_API_KEY non configurée" }, 503);

  const raw = await req.json().catch(() => ({}));
  const parsed = validateBody(raw, bodySchema);
  if (parsed.error) return parsed.error;

  const base64Clean = parsed.data.image_base64.replace(/^data:image\/[a-z]+;base64,/, "");
  const buf = Buffer.from(base64Clean, "base64");

  const header = parsed.data.image_base64.match(/^data:(image\/[a-z]+);base64,/);
  const mediaType = (header?.[1] ?? "image/jpeg") as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

  // ── Step 1: Claude gate ──
  let gateRawText = "";
  try {
    const gateMsg = await client.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 5,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64Clean } },
          { type: "text", text: APPLE_GATE_PROMPT },
        ],
      }],
    });
    gateRawText = (gateMsg.content[0] as { type: string; text: string }).text.trim();
  } catch (err) {
    return json({ success: false, error: `Vérification IA indisponible : ${err instanceof Error ? err.message.slice(0, 120) : String(err)}` }, 503);
  }

  if (!/^oui/i.test(gateRawText)) {
    return json({
      success: false,
      error: "Nous détectons uniquement les maladies des pommiers. Veuillez importer une photo de feuille de pommier (Malus domestica).",
    }, 422);
  }

  // ── Step 2: ONNX inference ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let session: any;
  try { session = await getSession(); }
  catch (err) { return json({ success: false, error: `Modèle non disponible : ${err instanceof Error ? err.message : String(err)}` }, 503); }

  let onnxData: Float32Array;
  let dims: number[];
  try {
    ({ data: onnxData, dims } = await runOnnx(session, buf));
  } catch (err) {
    return json({ success: false, error: `Inférence échouée : ${err instanceof Error ? err.message : String(err)}` }, 500);
  }

  // Detect model type from output shape
  // Detection: [1, 4+nc, numAnchors] (dims.length === 3)
  // Classification: [1, nc] (dims.length <= 2)
  const isDetection = dims.length === 3 && dims[2] > 100;
  const nc = isDetection ? dims[1] - 4 : dims[dims.length - 1];
  const classMap = nc <= 4 ? CLASS_MAP_4 : CLASS_MAP_5;

  const { classIdx, confidence, probs } = isDetection
    ? classifyDetection(onnxData, dims[2], nc)
    : classifyDirect(onnxData);

  const cls = classMap[classIdx] ?? { label: "Unknown", labelFr: "Inconnu" };

  return json({
    success:    true,
    label:      cls.labelFr,
    confidence,
    predictions: Object.entries(classMap)
      .map(([idx, c]) => ({ label: c.labelFr, score: probs[Number(idx)] ?? 0 }))
      .sort((a, b) => b.score - a.score),
    modelVersion: "apple-disease-onnx-v1",
    source:       "onnx",
  });
}
