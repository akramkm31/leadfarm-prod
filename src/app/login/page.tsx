"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Leaf, Eye, EyeOff, ArrowRight, Tractor } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Identifiants requis");
      return;
    }

    setLoading(true);
    const supabase = getSupabaseBrowser();

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(
        authError.message === "Invalid login credentials"
          ? "Email ou mot de passe incorrect"
          : authError.message
      );
      setLoading(false);
      return;
    }

    router.push(redirect);
    router.refresh();
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      <div className="farm-backdrop" />

      <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-green-600/10 blur-[100px] animate-pulse" />
      <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-amber-500/8 blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/25 to-green-600/20 border border-amber-500/30 mb-4 glow-amber">
            <Leaf className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-3xl font-bold text-white/90 tracking-tight">LeadFarm</h1>
          <p className="text-sm text-white/40 mt-2 font-mono">
            Precision Agriculture Platform
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="glass-card p-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white/85">Connexion</h2>
              <p className="text-xs text-white/40 mt-1">
                Accédez au tableau de bord de votre exploitation
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/25 text-sm text-red-300" role="alert">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-medium text-white/45 mb-2">
                  Adresse email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  placeholder="akram@leadfarm.dz"
                  className="glass-input w-full px-4 py-3 text-sm"
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-medium text-white/45 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="glass-input w-full px-4 py-3 pr-10 text-sm"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded border border-white/15 bg-white/[0.05] accent-amber-500"
                  />
                  <span className="text-xs text-white/40">Rester connecté</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full glass-button py-3.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                ) : (
                  <>
                    Se connecter
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-2 text-white/25 text-xs">
            <Tractor className="w-3.5 h-3.5" />
            <span>LeadFarm v1.0 — Gestion agricole de précision</span>
          </div>
        </div>
      </div>
    </div>
  );
}