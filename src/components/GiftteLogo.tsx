export function GiftteLogo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect width="64" height="64" rx="16" fill="#12372A" />
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        rx="13"
        stroke="#D49B4B"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
      {/* Warm Ivory Parcel Box */}
      <rect x="16" y="27" width="32" height="22" rx="4" fill="#FAF7F2" />
      {/* Box Lid */}
      <rect x="14" y="22" width="36" height="7" rx="3" fill="#F3EDE3" />
      {/* Burnished Ochre Silk Ribbon */}
      <rect x="29.5" y="22" width="5" height="27" fill="#C47A38" />
      <rect x="16" y="36" width="32" height="3.5" fill="#C47A38" fillOpacity="0.22" />
      {/* Sculpted Ribbon Bow */}
      <path
        d="M32 22C26.8 22 20.5 19.2 21 14.5C21.4 11 25.2 10 28 12.2C30.4 14.1 31.6 18.2 32 22Z"
        fill="#D49B4B"
      />
      <path
        d="M32 22C37.2 22 43.5 19.2 43 14.5C42.6 11 38.8 10 36 12.2C33.6 14.1 32.4 18.2 32 22Z"
        fill="#D49B4B"
      />
      <circle cx="32" cy="21.5" r="2.6" fill="#B97332" />
    </svg>
  );
}
