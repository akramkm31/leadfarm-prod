"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, ArrowRight, Tractor, Leaf, ShieldCheck, Wrench, Package, HardHat, ClipboardList, UserCog } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

const PROFILES = [
  {
    role: "directeur",
    label: "Directeur",
    sub: "Accès complet + admin",
    icon: ShieldCheck,
    color: "#0071e3",
    bg: "#eff6ff",
    border: "#bfdbfe",
  },
  {
    role: "responsable_technique",
    label: "Resp. Technique",
    sub: "Pilotage agronomique",
    icon: Wrench,
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ddd6fe",
  },
  {
    role: "magasinier",
    label: "Magasinier",
    sub: "Stock phytosanitaire",
    icon: Package,
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fde68a",
  },
  {
    role: "operateur",
    label: "Opérateur",
    sub: "Terrain & traitements",
    icon: HardHat,
    color: "#059669",
    bg: "#ecfdf5",
    border: "#a7f3d0",
  },
  {
    role: "auditeur",
    label: "Auditeur",
    sub: "Conformité & rapports",
    icon: ClipboardList,
    color: "#7424b5",
    bg: "#faf5ff",
    border: "#e9d5ff",
  },
  {
    role: "consultant",
    label: "Consultant",
    sub: "Plans cross-tenant",
    icon: UserCog,
    color: "#0891b2",
    bg: "#ecfeff",
    border: "#a5f3fc",
  },
] as const;

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState(process.env.NEXT_PUBLIC_DEMO_EMAIL ?? "");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("directeur");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quickLoading, setQuickLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const doLogin = async (emailVal: string, passwordVal: string, role: string) => {
    setError("");
    const supabase = getSupabaseBrowser();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: emailVal,
      password: passwordVal,
    });
    if (authError) {
      setError(
        authError.message === "Invalid login credentials"
          ? "Email ou mot de passe incorrect"
          : authError.message
      );
      return false;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("leadfarm_mock_role", role);
    }
    router.push(redirect);
    router.refresh();
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Identifiants requis"); return; }
    setLoading(true);
    await doLogin(email, password, selectedRole);
    setLoading(false);
  };

  const handleQuickLogin = async (role: string) => {
    const demoEmail = process.env.NEXT_PUBLIC_DEMO_EMAIL;
    const demoPassword = process.env.NEXT_PUBLIC_DEMO_PASSWORD;
    if (!demoEmail || !demoPassword) {
      // No demo creds — pre-fill role and let user type password
      setSelectedRole(role);
      setError("");
      return;
    }
    setQuickLoading(role);
    await doLogin(demoEmail, demoPassword, role);
    setQuickLoading(null);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden" style={{ background: "var(--color-canvas-ice)" }}>
      <div className="relative z-10 w-full max-w-lg mx-4 py-10">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-2 mb-3">
            <Leaf className="w-5 h-5 text-[var(--color-valley-green)]" />
            <h1 className="text-3xl font-bold text-[var(--color-adaline-ink)] tracking-tight">LeadFarm</h1>
          </div>
          <p className="mono text-[11px] text-[var(--color-mist-gray)] uppercase tracking-widest">
            Precision Agriculture · Adaline
          </p>
        </div>

        {/* Profile cards */}
        <div className="card-soft p-6 mb-4">
          <p className="text-xs font-semibold text-[var(--color-adaline-ink)]/50 uppercase tracking-widest mb-4">
            Connexion rapide par profil
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            {PROFILES.map((p) => {
              const Icon = p.icon;
              const isActive = selectedRole === p.role;
              const isSpinning = quickLoading === p.role;
              return (
                <button
                  key={p.role}
                  type="button"
                  onClick={() => handleQuickLogin(p.role)}
                  disabled={!!quickLoading || loading}
                  style={{
                    background: isActive ? p.bg : "white",
                    borderColor: isActive ? p.color : p.border,
                    borderWidth: isActive ? "2px" : "1px",
                  }}
                  className="relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all hover:shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSpinning ? (
                    <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
                  ) : (
                    <Icon className="w-5 h-5" style={{ color: p.color }} />
                  )}
                  <span className="text-[11px] font-semibold text-[var(--color-adaline-ink)]/80 leading-tight text-center">{p.label}</span>
                  <span className="text-[9px] text-[var(--color-mist-gray)] leading-tight text-center">{p.sub}</span>
                  {isActive && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
                  )}
                </button>
              );
            })}
          </div>
          {!process.env.NEXT_PUBLIC_DEMO_PASSWORD && (
            <p className="text-[10px] text-[var(--color-mist-gray)] text-center mt-3">
              Sélectionnez un profil puis saisissez vos identifiants ci-dessous
            </p>
          )}
        </div>

        {/* Credentials form */}
        <form onSubmit={handleSubmit}>
          <div className="card-soft p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[var(--color-adaline-ink)]/85">Identifiants</h2>
                <p className="text-xs text-[var(--color-adaline-ink)]/50 mt-0.5">
                  Profil sélectionné : <span className="font-medium text-[var(--color-adaline-ink)]/70">{PROFILES.find(p => p.role === selectedRole)?.label}</span>
                </p>
              </div>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="glass-input px-3 py-1.5 text-xs bg-white text-gray-700 font-medium rounded-lg"
              >
                {PROFILES.map(p => (
                  <option key={p.role} value={p.role}>{p.label}</option>
                ))}
              </select>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-[rgba(107,31,10,0.06)] border border-[rgba(107,31,10,0.35)] text-sm text-[var(--c-danger)]" role="alert">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="akram@leadfarm.dz"
                className="glass-input w-full px-4 py-3 text-sm"
                autoComplete="email"
                required
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="glass-input w-full px-4 py-3 pr-10 text-sm"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-adaline-ink)]/30 hover:text-[var(--color-adaline-ink)]/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || !!quickLoading}
                className="w-full lf-btn lf-btn-primary py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Connexion…</>
                ) : (
                  <>Se connecter <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </div>
        </form>

        <div className="mt-5 text-center flex items-center justify-center gap-2 text-[var(--color-adaline-ink)]/40 text-xs">
          <Tractor className="w-3.5 h-3.5" />
          <span>LeadFarm v1.0 — KHELIFA LTD · USTO-MB 2026</span>
        </div>
      </div>
    </div>
  );
}
