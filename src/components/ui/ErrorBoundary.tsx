"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="glass-card p-8 text-center space-y-4" role="alert">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--color-valley-green)]/15 border border-[var(--color-valley-green)]/25">
            <AlertTriangle className="w-6 h-6 text-[var(--color-valley-green)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-adaline-ink)]/80">Une erreur est survenue</h3>
            <p className="text-xs text-[var(--color-adaline-ink)]/40 mt-1 max-w-md mx-auto">
              {this.state.error?.message || "Erreur inattendue"}
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="glass-button px-4 py-2 text-xs inline-flex items-center gap-2"
          >
            <RefreshCw className="w-3 h-3" />
            Réessayer
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}