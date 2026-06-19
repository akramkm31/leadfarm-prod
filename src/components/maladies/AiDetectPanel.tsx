"use client";

import { useRef, useState } from "react";
import { Bot, Upload, X, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type DetectResult = {
  classIdx: number;
  name: string;
  nameFr: string;
  confidence: number;
  severite: string;
};

type Props = {
  onDetected: (result: DetectResult) => void;
  onClose: () => void;
};

const CLASS_FR    = ["Tavelure", "Rouille", "Oïdium", "Pourriture noire", "Sain"];
const CLASS_EN    = ["scab", "rust", "powdery_mildew", "black_rot", "healthy"];
const CLASS_SEV   = ["elevee", "moderee", "moderee", "critique", "faible"];
const NUM_ANCHORS = 8400;
const NC          = 5;
const IMG_SIZE    = 640;
const THRESHOLD   = 0.15;

let sessionCache: unknown = null;

export default function AiDetectPanel({ onDetected, onClose }: Props) {
  const [image, setImage]   = useState<string | null>(null);
  const [result, setResult] = useState<DetectResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState<string>("");
  const [error, setError]     = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setImage(URL.createObjectURL(file));
    setResult(null);
    setError(null);
    setStatus("");
  };

  const analyse = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);
    try {
      setStatus("Chargement du modèle…");
      const ort = (await import("onnxruntime-web")).default;
      ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0/dist/";

      if (!sessionCache) {
        sessionCache = await ort.InferenceSession.create("/models/best.onnx", {
          executionProviders: ["wasm"],
        });
      }
      const session = sessionCache as Awaited<ReturnType<typeof ort.InferenceSession.create>>;

      setStatus("Prétraitement de l'image…");
      const img = new Image();
      img.src = image;
      await new Promise<void>((res) => { img.onload = () => res(); });

      const canvas = document.createElement("canvas");
      canvas.width = IMG_SIZE;
      canvas.height = IMG_SIZE;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, IMG_SIZE, IMG_SIZE);
      const px = ctx.getImageData(0, 0, IMG_SIZE, IMG_SIZE).data;

      const input = new Float32Array(3 * IMG_SIZE * IMG_SIZE);
      for (let i = 0; i < IMG_SIZE * IMG_SIZE; i++) {
        input[i]                       = px[i * 4]     / 255;
        input[IMG_SIZE * IMG_SIZE + i] = px[i * 4 + 1] / 255;
        input[2 * IMG_SIZE * IMG_SIZE + i] = px[i * 4 + 2] / 255;
      }

      setStatus("Inférence YOLOv8…");
      const tensor = new ort.Tensor("float32", input, [1, 3, IMG_SIZE, IMG_SIZE]);
      const out    = await session.run({ images: tensor });
      const data   = out[Object.keys(out)[0]].data as Float32Array;

      let bestConf = THRESHOLD;
      let bestClass = -1;
      for (let i = 0; i < NUM_ANCHORS; i++) {
        for (let c = 0; c < NC; c++) {
          const score = data[(4 + c) * NUM_ANCHORS + i];
          if (score > bestConf) { bestConf = score; bestClass = c; }
        }
      }

      if (bestClass === -1) {
        setError("Aucune détection avec confiance suffisante. Essayez une image plus nette de la feuille.");
        return;
      }

      setResult({
        classIdx:   bestClass,
        name:       CLASS_EN[bestClass],
        nameFr:     CLASS_FR[bestClass],
        confidence: bestConf,
        severite:   CLASS_SEV[bestClass],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'analyse");
    } finally {
      setLoading(false);
      setStatus("");
    }
  };

  return (
    <div className="glass-card border border-purple-200 bg-purple-50/20 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
            <Bot className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--color-adaline-ink)]">Détection IA</p>
            <p className="text-[10px] text-[var(--color-mist-gray)]">YOLOv8 · tavelure · rouille · oïdium · pourriture noire</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-purple-100 transition-colors">
          <X className="w-4 h-4 text-[var(--color-mist-gray)]" />
        </button>
      </div>

      {/* Drop zone */}
      <div
        className={cn(
          "relative rounded-xl border-2 border-dashed transition-colors",
          image
            ? "border-purple-300 h-52 overflow-hidden"
            : "border-purple-200 h-32 flex items-center justify-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/50"
        )}
        onClick={() => !image && fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      >
        {image ? (
          <>
            <img src={image} alt="preview" className="w-full h-full object-contain bg-white" />
            <button
              onClick={e => { e.stopPropagation(); setImage(null); setResult(null); setError(null); }}
              className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <div className="text-center px-4">
            <Upload className="w-6 h-6 mx-auto text-purple-300 mb-1.5" />
            <p className="text-xs text-[var(--color-mist-gray)]">Déposer ou cliquer pour importer</p>
            <p className="text-[10px] text-purple-400 mt-0.5">Photo de feuille · JPG, PNG, WebP</p>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="rounded-xl bg-white border border-purple-200 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className={cn("w-4 h-4", result.classIdx === 4 ? "text-emerald-500" : "text-orange-500")} />
              <p className="text-sm font-bold text-[var(--color-adaline-ink)]">{result.nameFr}</p>
            </div>
            <span className="text-xs font-black text-purple-600">{(result.confidence * 100).toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-full bg-purple-100 overflow-hidden">
            <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${result.confidence * 100}%` }} />
          </div>
          <p className="text-[10px] text-[var(--color-mist-gray)]">
            {result.classIdx !== 4 ? `Sévérité estimée : ${result.severite}` : "Aucune maladie détectée"}
          </p>
          {result.classIdx !== 4 ? (
            <button
              onClick={() => onDetected(result)}
              className="w-full py-2 text-xs font-bold rounded-xl bg-[var(--color-valley-green)] text-white hover:opacity-90 transition-opacity"
            >
              Créer une observation pour cette maladie
            </button>
          ) : (
            <p className="text-xs text-center text-emerald-600 font-semibold py-1">✓ Plante saine — aucune observation requise</p>
          )}
        </div>
      )}

      {/* Analyse button */}
      {image && !result && (
        <button
          disabled={loading}
          onClick={analyse}
          className="w-full py-2.5 text-xs font-bold rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
          {loading ? status || "Analyse en cours…" : "Analyser avec l'IA"}
        </button>
      )}
    </div>
  );
}
