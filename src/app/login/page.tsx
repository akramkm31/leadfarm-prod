"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

const HERO_IMAGE_SRC =
  "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=2160&q=80";

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
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const doLogin = async (emailVal: string, passwordVal: string) => {
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
    router.push(redirect);
    router.refresh();
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Identifiants requis"); return; }
    setLoading(true);
    await doLogin(email, password);
    setLoading(false);
  };

  return (
    <div className="lf-login">
      <section className="lf-login__form-col">
        <div className="lf-login__inner">
          <header className="lf-login__brand">
            <h1 className="lf-login__headline lf-login__animate lf-login__animate--1">
              LeadFarm
            </h1>
            <p className="lf-login__wordmark lf-login__animate lf-login__animate--2">
              Se connecter
            </p>
            <p className="lf-login__caption lf-login__animate lf-login__animate--3">
              Accédez à votre compte et poursuivez votre suivi phytosanitaire
            </p>
          </header>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="lf-login__alert lf-login__animate lf-login__animate--4" role="alert">
                {error}
              </div>
            )}

            <div className="lf-login__fields">
              <div className="lf-login__field lf-login__animate lf-login__animate--4">
                <label className="lf-login__label" htmlFor="login-email">
                  Adresse e-mail
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="akram@leadfarm.dz"
                  className="lf-login__input"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="lf-login__field lf-login__animate lf-login__animate--5">
                <label className="lf-login__label" htmlFor="login-password">
                  Mot de passe
                </label>
                <div className="lf-login__field-wrap">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="lf-login__input lf-login__input--password"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="lf-login__toggle"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? (
                      <EyeOff size={16} strokeWidth={1.5} />
                    ) : (
                      <Eye size={16} strokeWidth={1.5} />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="lf-login__cta lf-login__animate lf-login__animate--6"
              >
                {loading ? (
                  <>
                    <span className="lf-login__spinner" aria-hidden />
                    Connexion…
                  </>
                ) : (
                  <>
                    Se connecter
                    <ArrowRight size={16} strokeWidth={1.5} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="lf-login__hero-col" aria-hidden="true">
        <div
          className="lf-login__hero lf-login__animate lf-login__animate--hero"
          style={{ backgroundImage: `url(${HERO_IMAGE_SRC})` }}
        />
      </section>
    </div>
  );
}
