// src/app/loading.tsx — Global loading skeleton (App Router convention)
// Shown by Next.js while any Server Component in the root layout is loading.
export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* Animated logo mark */}
        <div className="w-14 h-14 rounded-2xl bg-[#0071e3] flex items-center justify-center shadow-xl shadow-emerald-500/20 animate-pulse">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M14 4C8.48 4 4 8.48 4 14s4.48 10 10 10 10-4.48 10-10S19.52 4 14 4zm-1 14v-4H9l5-8v4h4l-5 8z" fill="white"/>
          </svg>
        </div>
        {/* Skeleton bars */}
        <div className="flex flex-col items-center gap-2 w-48">
          <div className="h-2 w-full rounded-full bg-[rgba(29,29,31,0.08)] animate-pulse" />
          <div className="h-2 w-3/4 rounded-full bg-[rgba(29,29,31,0.06)] animate-pulse" />
        </div>
        <p className="text-xs font-bold text-[#707070] tracking-widest uppercase">
          LeadFarm
        </p>
      </div>
    </div>
  );
}
