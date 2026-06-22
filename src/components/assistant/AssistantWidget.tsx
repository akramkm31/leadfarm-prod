"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Send,
  X,
  HelpCircle,
  RotateCcw,
  Loader2,
  ArrowRight,
  MousePointerClick,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAssistant } from "@/components/assistant/useAssistant";
import { ROLE_CHIP_ICONS } from "@/lib/assistant/profile-guide";

export default function AssistantWidget() {
  const {
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
  } = useAssistant();
  const [input, setInput] = useState("");
  const [helpMode, setHelpMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const RoleIcon = role ? ROLE_CHIP_ICONS[role] : Sparkles;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [transcript, busy, open]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { message } = (e as CustomEvent<{ message: string }>).detail;
      setOpen(true);
      send(message);
    };
    window.addEventListener("assistant:inject", handler);
    return () => window.removeEventListener("assistant:inject", handler);
  }, [send, setOpen]);

  useEffect(() => {
    if (!helpMode) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || target.closest("[data-assistant]")) return;
      const ctrl = target.closest("button, a, [role='button'], [role='tab'], input, select, label");
      if (!ctrl) return;
      e.preventDefault();
      e.stopPropagation();
      const label =
        (ctrl.getAttribute("aria-label") || ctrl.getAttribute("title") || ctrl.textContent || "")
          .trim()
          .replace(/\s+/g, " ")
          .slice(0, 80) || "élément";
      setHelpMode(false);
      explain(label);
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [helpMode, explain]);

  const submit = () => {
    if (!input.trim() || busy) return;
    send(input);
    setInput("");
  };

  if (!authed) return null;

  return (
    <div data-assistant className="assistant-root">
      {open && (
        <section className="assistant-panel" role="dialog" aria-label="Assistant IA LeadFarm">
          <header className="assistant-head">
            <div className="assistant-head-id">
              <span className="assistant-avatar">
                <Sparkles className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="assistant-name">Léa · Assistant IA</p>
                <p className="assistant-sub">Navigation · actions · explications par profil</p>
              </div>
            </div>
            <div className="assistant-head-actions">
              <button
                type="button"
                className={cn("assistant-icon-btn", helpMode && "is-active")}
                onClick={() => setHelpMode((v) => !v)}
                title="Mode aide : cliquez un bouton pour l'expliquer"
                aria-pressed={helpMode}
              >
                <HelpCircle className="w-4 h-4" />
                <span className="assistant-icon-btn-label">Aide</span>
              </button>
              <button type="button" className="assistant-icon-btn" onClick={reset} title="Nouvelle conversation">
                <RotateCcw className="w-4 h-4" />
                <span className="assistant-icon-btn-label">Reset</span>
              </button>
              <button
                type="button"
                className="assistant-icon-btn"
                onClick={() => setOpen(false)}
                title="Fermer"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          {roleLabel && (
            <div className="assistant-profile-bar">
              <span className="assistant-role-chip">
                <RoleIcon className="w-3 h-3 shrink-0" aria-hidden />
                {roleLabel}
              </span>
              <span className="assistant-page-chip">{pageLabel}</span>
            </div>
          )}

          {helpMode && (
            <div className="assistant-help-banner">
              <MousePointerClick className="w-3.5 h-3.5 shrink-0" />
              Mode aide — cliquez un bouton ou un onglet : je l&apos;explique pour votre profil ({roleLabel}).
            </div>
          )}

          <div className="assistant-scroll" ref={scrollRef}>
            {transcript.length === 0 && (
              <div className="assistant-empty">
                <span className="assistant-avatar assistant-avatar--lg">
                  <Sparkles className="w-5 h-5" />
                </span>
                <p className="assistant-empty-title">Bonjour, je suis Léa.</p>
                <p className="assistant-empty-desc">
                  Je connais votre profil <strong>{roleLabel}</strong> et la page{" "}
                  <strong>{pageLabel}</strong>. Demandez une explication, une navigation, ou activez{" "}
                  <strong>Aide</strong> puis cliquez n&apos;importe quel bouton.
                </p>
              </div>
            )}

            {transcript.map((item) =>
              item.kind === "action" ? (
                <div key={item.id} className={cn("assistant-action", item.tone === "warn" && "is-warn")}>
                  <ArrowRight className="w-3 h-3 shrink-0" />
                  {item.text}
                </div>
              ) : (
                <div
                  key={item.id}
                  className={cn("assistant-bubble", `assistant-bubble--${item.kind}`, item.tone === "warn" && "is-warn")}
                >
                  {item.text}
                </div>
              )
            )}

            {busy && !streaming && (
              <div className="assistant-bubble assistant-bubble--assistant assistant-typing">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Léa réfléchit…</span>
              </div>
            )}
          </div>

          {transcript.length === 0 && suggestions.length > 0 && (
            <div className="assistant-suggestions">
              {suggestions.map((s) => {
                const Icon = s.icon;
                return (
                  <button key={s.label} type="button" className="assistant-chip" onClick={() => send(s.prompt)}>
                    <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />
                    {s.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="assistant-input">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={`Question pour Léa (${roleLabel})…`}
              rows={1}
              aria-label="Message"
            />
            <button
              type="button"
              className="assistant-send"
              onClick={submit}
              disabled={busy || !input.trim()}
              aria-label="Envoyer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </section>
      )}

      <button
        type="button"
        className={cn("assistant-launcher", open && "is-open")}
        onClick={() => setOpen(!open)}
        aria-label={open ? "Réduire l'assistant" : "Ouvrir l'assistant IA"}
      >
        {open ? <X className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
        {!open && <span className="assistant-launcher-label">Assistant</span>}
      </button>
    </div>
  );
}
