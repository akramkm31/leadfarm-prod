type Props = { className?: string };

export function HomeArrowIcon({ className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function HomeFeatureIcon({ type }: { type: string }) {
  const props = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  switch (type) {
    case "map":
      return (
        <svg {...props}>
          <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
          <path d="M9 4v14M15 6v14" />
        </svg>
      );
    case "layers":
      return (
        <svg {...props}>
          <path d="m12 3 9 5-9 5-9-5 9-5Z" />
          <path d="m3 13 9 5 9-5M3 18l9 5 9-5" />
        </svg>
      );
    case "chart":
      return (
        <svg {...props}>
          <path d="M3 18s3-1 4-3 1-7 3-7 1 6 3 6 2-3 4-3 1 4 4 4" />
          <path d="M3 21h18" />
        </svg>
      );
    case "wifi":
      return (
        <svg {...props}>
          <path d="M5 12.5a10 10 0 0 1 14 0" />
          <path d="M8.5 16a5 5 0 0 1 7 0" />
          <circle cx="12" cy="19" r="1" />
          <path d="M2 9a14 14 0 0 1 20 0" />
        </svg>
      );
    case "sun":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <path d="M12 3 4 6v6c0 4.5 3.5 8 8 9 4.5-1 8-4.5 8-9V6l-8-3Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
  }
}
