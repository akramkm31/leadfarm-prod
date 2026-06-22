import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { withAuth, requireFeature, json } from "@/lib/api-helpers";
import path from "path";
import fs from "fs";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const APPLE_GATE_PROMPT = `Réponds avec un seul mot : OUI ou NON.

Quelle plante est représentée dans cette image ? Si et seulement si c'est une feuille de POMMIER (Malus domestica, arbre fruitier qui produit des pommes), réponds OUI.

NON obligatoire si : vigne, tomate, cerise, poivron, poire, pêche, prune, agrumes, blé, maïs, herbe, fleur, cactus, plante d'intérieur, légume, arbre non-fruitier, animal, personne, objet, paysage, photo floue ou peu claire, dessin, texte, interface.
NON si tu n'es pas certain à 100% que c'est un pommier.

Un seul mot en réponse.`;

const CLASS_MAP_4: Record<number, { nameFr: string; name: string; severite: string }> = {
  0: { nameFr: "Tavelure",         name: "Apple Scab",       severite: "moderee" },
  1: { nameFr: "Pourriture noire", name: "Apple Black Rot",  severite: "elevee"  },
  2: { nameFr: "Rouille",          name: "Cedar Apple Rust", severite: "moderee" },
  3: { nameFr: "Sain",             name: "Healthy",          severite: "faible"  },
};

const CLASS_MAP_5: Record<number, { nameFr: string; name: string; severite: string }> = {
  0: { nameFr: "Tavelure",         name: "Apple Scab",       severite: "moderee" },
  1: { nameFr: "Rouille",          name: "Apple Rust",       severite: "moderee" },
  2: { nameFr: "Oïdium",           name: "Powdery Mildew",   severite: "moderee" },
  3: { nameFr: "Pourriture noire", name: "Apple Black Rot",  severite: "elevee"  },
  4: { nameFr: "Sain",             name: "Healthy",          severite: "faible"  },
};

const NOTE_MAP: Record<string, string> = {
  "Apple Scab":       "Taches nécrotiques sombres caractéristiques de la tavelure détectées sur le feuillage.",
  "Apple Black Rot":  "Lésions brunes à noires avec pourrissement visible sur la feuille.",
  "Cedar Apple Rust": "Pustules orange-rouille caractéristiques sur la surface foliaire.",
  "Powdery Mildew":   "Dépôt blanc poudreux couvrant la surface foliaire.",
  "Apple Rust":       "Pustules rouillées caractéristiques de la rouille du pommier.",
  "Healthy":          "Aucun symptôme pathologique détecté — feuille en bonne santé.",
};

const ACTION_MAP: Record<string, string> = {
  "Apple Scab":       "Appliquer un fongicide (captane ou myclobutanil). Éliminer les feuilles infectées.",
  "Apple Black Rot":  "Tailler les bois morts, éliminer les momies. Traitement cuivrique recommandé.",
  "Cedar Apple Rust": "Supprimer les genévriers hôtes proches. Fongicide préventif au débourrement.",
  "Powdery Mildew":   "Traitement soufré ou trifloxystrobine. Améliorer l'aération de la frondaison.",
  "Apple Rust":       "Supprimer les hôtes alternatifs. Fongicide préventif en début de saison.",
  "Healthy":          "Aucune intervention requise. Maintenir la surveillance.",
};

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type AllowedType = typeof ALLOWED_TYPES[number];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _session: any = null;

async function getSession() {
  if (_session) return _session;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ort = require("onnxruntime-node");
  const modelPath = process.env.APPLE_DISEASE_MODEL_PATH
    ?? path.join(process.cwd(), "models", "apple-disease.onnx");
  if (!fs.existsSync(modelPath))
    throw new Error(`Modèle ONNX introuvable : ${modelPath}`);
  _session = await ort.InferenceSession.create(modelPath);
  return _session;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runOnnx(session: any, imageBytes: ArrayBuffer): Promise<{ data: Float32Array; dims: number[] }> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ort   = require("onnxruntime-node");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sharp = require("sharp");

  const inputSize = Number(process.env.APPLE_DISEASE_INPUT_SIZE ?? 640);
  const buf = Buffer.from(imageBytes);

  const { data } = await sharp(buf)
    .resize(inputSize, inputSize, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const float32 = new Float32Array(3 * inputSize * inputSize);
  for (let i = 0; i < inputSize * inputSize; i++) {
    float32[i]                          = data[i * 3]     / 255;
    float32[inputSize * inputSize + i]  = data[i * 3 + 1] / 255;
    float32[2 * inputSize * inputSize + i] = data[i * 3 + 2] / 255;
  }

  const tensor = new ort.Tensor("float32", float32, [1, 3, inputSize, inputSize]);
  const feeds  = { [session.inputNames[0]]: tensor };
  const out    = await session.run(feeds);
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
function classifyDirect(raw: Float32Array): { classIdx: number; confidence: number } {
  const probs = softmax(Array.from(raw));
  let maxIdx = 0, maxVal = probs[0];
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > maxVal) { maxVal = probs[i]; maxIdx = i; }
  }
  return { classIdx: maxIdx, confidence: maxVal };
}

// For detection models: output shape [1, 4+nc, numAnchors]
function classifyDetection(raw: Float32Array, numAnchors: number, nc: number): { classIdx: number; confidence: number } {
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
  return { classIdx: maxIdx, confidence: best };
}

export async function POST(req: NextRequest) {
  const auth = await withAuth(req);
  if (auth.error) return auth.error;
  const denied = requireFeature(auth, "maladies");
  if (denied) return denied;

  if (!process.env.ANTHROPIC_API_KEY)
    return json({ success: false, error: "ANTHROPIC_API_KEY non configurée" }, 503);

  let file: File | null = null;
  try {
    const form = await req.formData();
    file = form.get("image") as File | null;
  } catch {
    return json({ success: false, error: "Requête multipart invalide" }, 400);
  }

  if (!file) return json({ success: false, error: "Champ 'image' requis" }, 400);
  if (!ALLOWED_TYPES.includes(file.type as AllowedType))
    return json({ success: false, error: "Format non supporté — JPG, PNG, WebP, GIF uniquement" }, 415);
  if (file.size > 20 * 1024 * 1024)
    return json({ success: false, error: "Image trop grande (max 20 Mo)" }, 413);

  const bytes  = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");

  // ── Step 1: Claude gate ──
  let gateRawText = "";
  try {
    const gateMsg = await client.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 5,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: file.type as AllowedType, data: base64 } },
          { type: "text", text: APPLE_GATE_PROMPT },
        ],
      }],
    });
    gateRawText = (gateMsg.content[0] as { type: string; text: string }).text.trim();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return json({ success: false, error: `Vérification IA indisponible : ${msg.slice(0, 120)}` }, 503);
  }

  const isApple = /^oui/i.test(gateRawText);
  if (!isApple) {
    return json({
      success:  false,
      notApple: true,
      error: "Nous détectons uniquement les maladies des pommiers. Veuillez importer une photo de feuille de pommier (Malus domestica).",
    }, 422);
  }

  // ── Step 2: ONNX inference ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let session: any;
  try {
    session = await getSession();
  } catch (err) {
    return json({ success: false, error: `Modèle ONNX non disponible : ${err instanceof Error ? err.message : String(err)}` }, 503);
  }

  let onnxData: Float32Array;
  let dims: number[];
  try {
    ({ data: onnxData, dims } = await runOnnx(session, bytes));
  } catch (err) {
    return json({ success: false, error: `Inférence échouée : ${err instanceof Error ? err.message : String(err)}` }, 500);
  }

  // Detect model type from output shape
  const isDetection = dims.length === 3 && dims[2] > 100;
  const nc = isDetection ? dims[1] - 4 : dims[dims.length - 1];
  const classMap = nc <= 4 ? CLASS_MAP_4 : CLASS_MAP_5;

  const { classIdx, confidence } = isDetection
    ? classifyDetection(onnxData, dims[2], nc)
    : classifyDirect(onnxData);

  const cls = classMap[classIdx] ?? { nameFr: "Inconnu", name: "Unknown", severite: "faible" };

  return json({
    success: true,
    data: {
      classIdx,
      name:       cls.name,
      nameFr:     cls.nameFr,
      confidence: Math.min(confidence, 0.99),
      severite:   cls.name === "Healthy" ? "faible" : cls.severite,
      note_fr:    NOTE_MAP[cls.name]   ?? "",
      action_fr:  ACTION_MAP[cls.name] ?? "",
    },
  });
}
