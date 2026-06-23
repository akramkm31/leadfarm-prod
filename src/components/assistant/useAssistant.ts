"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { FARM_DISPLAY_NAME } from "@/lib/ux-labels";
import { pagesForFeatures } from "@/lib/assistant/catalog";
import {
  formatProfileGuideForPrompt,
  getPageLabel,
  getPageUiHints,
  getSuggestionsForProfile,
} from "@/lib/assistant/profile-guide";
import { fetchParcelles } from "@/lib/parcelles/repository";
import { fetchProducts, fetchOperators } from "@/lib/data-provider";
import { useAccessContext } from "@/components/auth/AccessProvider";
import type { Feature } from "@/lib/rbac/types";

type Block =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string };

type ApiMessage = { role: "user" | "assistant"; content: string | Block[] };

export type TranscriptItem = {
  id: string;
  kind: "user" | "assistant" | "action";
  text: string;
  tone?: "ok" | "warn";
};

// Module store — survives AppLayout remount on client navigation (used by navigate tool).
const store: { messages: ApiMessage[]; transcript: TranscriptItem[]; open: boolean } = {
  messages: [],
  transcript: [],
  open: false,
};
let idCounter = 0;
const nextId = () => `a${++idCounter}`;

export function useAssistant() {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, roleLabel, can: canFeature, loading: accessLoading } = useAccessContext();

  const [messages, setMessages] = useState<ApiMessage[]>(() => store.messages);
  const [transcript, setTranscript] = useState<TranscriptItem[]>(() => store.transcript);
  const [open, setOpen] = useState(() => store.open);
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState(false);

  const can = useCallback((f: Feature) => canFeature(f), [canFeature]);

  const authed = !accessLoading && profile !== null;
  const role = profile?.role ?? null;
  const pageLabel = useMemo(() => getPageLabel(pathname ?? "/dashboard"), [pathname]);
  const suggestions = useMemo(
    () => (role ? getSuggestionsForProfile(role, pathname ?? "/dashboard") : []),
    [role, pathname]
  );

  useEffect(() => { store.messages = messages; }, [messages]);
  useEffect(() => { store.transcript = transcript; }, [transcript]);
  useEffect(() => { store.open = open; }, [open]);

  const pushItem = useCallback((kind: TranscriptItem["kind"], text: string, tone?: TranscriptItem["tone"]) => {
    setTranscript((t) => [...t, { id: nextId(), kind, text, tone }]);
  }, []);

  const buildContext = useCallback(() => ({
    pathname,
    pageLabel,
    role: profile?.role,
    roleLabel,
    farmName: FARM_DISPLAY_NAME,
    canCreateTreatment: can("treatments.plan"),
    canEditStock: can("stock.edit"),
    canExecuteTreatment: can("treatments.execute"),
    profileGuide: profile ? formatProfileGuideForPrompt(profile.role) : "",
    pageUiHints: getPageUiHints(pathname ?? "", profile?.role),
    pages: pagesForFeatures(can).map((p) => ({
      path: p.path,
      label: p.label,
      description: p.description,
    })),
  }), [pathname, pageLabel, profile, roleLabel, can]);

  const execTool = useCallback(
    async (name: string, input: Record<string, unknown>): Promise<{ result: string; chip?: { text: string; tone?: "ok" | "warn" } }> => {
      if (name === "navigate") {
        const path = String(input?.path || "");
        const allowed = pagesForFeatures(can).some(
          (p) => path === p.path || path.startsWith(p.path + "/")
        );
        if (!allowed) return { result: `Navigation refusée : ${path} non autorisé pour ce profil.`, chip: { text: `Refusé : ${path}`, tone: "warn" } };
        router.push(path);
        return { result: `Navigation effectuée vers ${path}.`, chip: { text: `Ouverture de ${path}`, tone: "ok" } };
      }

      if (name === "list_options") {
        const kind = String(input?.kind);
        try {
          if (kind === "parcelles") {
            const ps = (await fetchParcelles()) as { name?: string; children?: { name?: string }[] }[];
            const names = ps.flatMap((p) => [p.name, ...((p.children ?? []).map((c) => c.name))]).filter(Boolean).slice(0, 40);
            return { result: JSON.stringify(names) };
          }
          if (kind === "products") {
            const ps = (await fetchProducts()) as Record<string, unknown>[];
            return { result: JSON.stringify(ps.map((p) => p.productName || p.trade_name || p.name).filter(Boolean).slice(0, 40)) };
          }
          if (kind === "operators") {
            const ops = (await fetchOperators()) as Record<string, unknown>[];
            return { result: JSON.stringify(ops.map((o) => o.fullName || o.full_name || o.name).filter(Boolean).slice(0, 40)) };
          }
        } catch {
          return { result: "Impossible de récupérer la liste pour le moment." };
        }
        return { result: "Type d'option inconnu." };
      }

      if (name === "create_treatment") {
        if (!can("treatments.plan")) return { result: "Action non autorisée pour ce profil.", chip: { text: "Création refusée (droits)", tone: "warn" } };
        const notes = [
          input?.culture ? `Culture : ${String(input.culture)}` : "",
          input?.observations ? String(input.observations) : "",
        ].filter(Boolean).join(" · ");
        const body = {
          site_name: String(input?.parcelle_name || "").slice(0, 200),
          planned_date: String(input?.planned_date || ""),
          ...(notes ? { notes } : {}),
        };
        try {
          const res = await fetch("/api/v1/treatments", {
            method: "POST",
            headers: { "content-type": "application/json" },
            credentials: "include",
            body: JSON.stringify(body),
          });
          const data = await res.json();
          if (!res.ok) {
            const detail = data?.details ? ` — ${JSON.stringify(data.details)}` : "";
            const msg = data?.error || `erreur ${res.status}`;
            return {
              result: `La création a échoué : ${msg}${detail}. Demande à l'utilisateur de vérifier les champs (parcelle, date) et de réessayer, ou de créer le traitement manuellement depuis la page Traitements.`,
              chip: { text: "Échec création traitement", tone: "warn" },
            };
          }
          return {
            result: `Traitement créé avec succès pour « ${body.site_name} » le ${body.planned_date}. L'utilisateur peut le retrouver dans la page Traitements.`,
            chip: { text: `Traitement créé · ${body.site_name}`, tone: "ok" },
          };
        } catch {
          return {
            result: "Impossible de joindre le serveur (erreur réseau). Demande à l'utilisateur de vérifier sa connexion et de réessayer.",
            chip: { text: "Échec création traitement", tone: "warn" },
          };
        }
      }

      return { result: `Outil inconnu : ${name}` };
    },
    [router, can]
  );

  const runLoop = useCallback(
    async (start: ApiMessage[]) => {
      setBusy(true);
      let convo = start;
      try {
        for (let i = 0; i < 6; i++) {
          const res = await fetch("/api/assistant", {
            method: "POST",
            credentials: "include",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ messages: convo, context: buildContext() }),
          });

          if (!res.ok || !res.body) {
            const data = await res.json().catch(() => ({}));
            pushItem("assistant", (data as { error?: string })?.error || "Assistant indisponible.", "warn");
            break;
          }

          // Stream SSE
          const streamId = nextId();
          let streamText = "";
          let doneData: { content: Block[]; stop_reason: string } | null = null;

          setTranscript((t) => [...t, { id: streamId, kind: "assistant", text: "" }]);
          setStreaming(true);

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buf = "";

          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              try {
                const ev = JSON.parse(line.slice(6)) as { type: string; text?: string; content?: Block[]; stop_reason?: string; error?: string };
                if (ev.type === "text") {
                  streamText += ev.text ?? "";
                  setTranscript((t) =>
                    t.map((item) => (item.id === streamId ? { ...item, text: streamText } : item))
                  );
                } else if (ev.type === "done") {
                  doneData = ev as { content: Block[]; stop_reason: string };
                } else if (ev.type === "error") {
                  setTranscript((t) =>
                    t.map((item) => (item.id === streamId ? { ...item, text: ev.error ?? "Erreur", tone: "warn" as const } : item))
                  );
                }
              } catch { /* skip */ }
            }
          }

          setStreaming(false);

          if (!doneData) break;
          if (!streamText) setTranscript((t) => t.filter((item) => item.id !== streamId));

          const content: Block[] = doneData.content;
          convo = [...convo, { role: "assistant", content }];

          const toolUses = content.filter((b): b is Extract<Block, { type: "tool_use" }> => b.type === "tool_use");
          if (toolUses.length === 0) break;

          const results: Block[] = [];
          for (const tu of toolUses) {
            const { result, chip } = await execTool(tu.name, tu.input);
            if (chip) pushItem("action", chip.text, chip.tone);
            results.push({ type: "tool_result", tool_use_id: tu.id, content: result });
          }
          convo = [...convo, { role: "user", content: results }];
        }
      } finally {
        setMessages(convo);
        setStreaming(false);
        setBusy(false);
      }
    },
    [buildContext, execTool, pushItem]
  );

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      pushItem("user", trimmed);
      const next: ApiMessage[] = [...messages, { role: "user", content: trimmed }];
      setMessages(next);
      void runLoop(next);
    },
    [messages, busy, runLoop, pushItem]
  );

  const explain = useCallback(
    (label: string) => {
      setOpen(true);
      const hints = getPageUiHints(pathname ?? "", profile?.role);
      const guide = profile ? formatProfileGuideForPrompt(profile.role) : "";
      send(
        `[Aide interface · profil ${roleLabel} · page ${pageLabel} (${pathname})]\n` +
          (guide ? `Contexte profil :\n${guide}\n` : "") +
          (hints ? `Éléments de cette page :\n${hints}\n` : "") +
          `Explique l'élément « ${label} » : à quoi il sert, quand l'utiliser, étapes concrètes, et si mon profil y a accès.`
      );
    },
    [send, pathname, profile, roleLabel, pageLabel]
  );

  const reset = useCallback(() => {
    setMessages([]);
    setTranscript([]);
  }, []);

  return {
    authed,
    open,
    setOpen,
    transcript,
    busy,
    streaming,
    send,
    explain,
    reset,
    role,
    roleLabel,
    pageLabel,
    suggestions,
  };
}
