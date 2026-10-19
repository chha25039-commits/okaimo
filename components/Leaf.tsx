export function LeafIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <path
        d="M6 26C6 14 13 6 26 5c0 12-7 20-20 21Z"
        fill="currentColor"
        opacity="0.18"
      />
      <path
        d="M6 26C6 14 13 6 26 5c0 12-7 20-20 21Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M6 26 20 12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Sprig({ className = "" }: { className?: string }) {
  const leaf = "M0 0C-6 -8 -6 -18 0 -26C6 -18 6 -8 0 0Z";
  return (
    <svg
      viewBox="0 0 120 160"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <path
        d="M60 156C60 110 62 70 60 30"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <g
        fill="currentColor"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      >
        <path d={leaf} transform="translate(60 30)" />
        <path d={leaf} transform="translate(61 62) rotate(-55) scale(1.5)" />
        <path d={leaf} transform="translate(61 62) rotate(55) scale(1.5)" />
        <path d={leaf} transform="translate(61 100) rotate(-60) scale(1.8)" />
        <path d={leaf} transform="translate(61 100) rotate(60) scale(1.8)" />
        <path d={leaf} transform="translate(60 132) rotate(-65) scale(1.5)" />
        <path d={leaf} transform="translate(60 132) rotate(65) scale(1.5)" />
      </g>
    </svg>
  );
}