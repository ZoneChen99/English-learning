import { Season } from "@/lib/season";

function SpringArt() {
  return (
    <svg viewBox="0 0 240 240" className="w-full h-full" fill="none">
      <path d="M64 205 C 60 165 66 135 64 108" stroke="#8FBF8F" strokeWidth="4" strokeLinecap="round" />
      <path d="M120 210 C 120 168 118 138 120 110" stroke="#8FBF8F" strokeWidth="4" strokeLinecap="round" />
      <path d="M176 205 C 180 165 174 135 176 108" stroke="#8FBF8F" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="52" cy="155" rx="11" ry="5" fill="#8FBF8F" transform="rotate(-35 52 155)" />
      <ellipse cx="188" cy="155" rx="11" ry="5" fill="#8FBF8F" transform="rotate(35 188 155)" />
      <g transform="translate(64 92)">
        <circle cx="0" cy="-14" r="9" fill="#F3C6D3" />
        <circle cx="13" cy="-4" r="9" fill="#F3C6D3" />
        <circle cx="8" cy="11" r="9" fill="#F3C6D3" />
        <circle cx="-8" cy="11" r="9" fill="#F3C6D3" />
        <circle cx="-13" cy="-4" r="9" fill="#F3C6D3" />
        <circle cx="0" cy="0" r="7" fill="#F6D98A" />
      </g>
      <g transform="translate(120 96)">
        <circle cx="0" cy="-17" r="11" fill="#F3C6D3" />
        <circle cx="16" cy="-5" r="11" fill="#F3C6D3" />
        <circle cx="10" cy="14" r="11" fill="#F3C6D3" />
        <circle cx="-10" cy="14" r="11" fill="#F3C6D3" />
        <circle cx="-16" cy="-5" r="11" fill="#F3C6D3" />
        <circle cx="0" cy="0" r="8" fill="#F6D98A" />
      </g>
      <g transform="translate(176 92)">
        <circle cx="0" cy="-14" r="9" fill="#F3C6D3" />
        <circle cx="13" cy="-4" r="9" fill="#F3C6D3" />
        <circle cx="8" cy="11" r="9" fill="#F3C6D3" />
        <circle cx="-8" cy="11" r="9" fill="#F3C6D3" />
        <circle cx="-13" cy="-4" r="9" fill="#F3C6D3" />
        <circle cx="0" cy="0" r="7" fill="#F6D98A" />
      </g>
    </svg>
  );
}

function SummerArt() {
  return (
    <svg viewBox="0 0 240 240" className="w-full h-full" fill="none">
      <circle cx="180" cy="60" r="26" fill="#E0A93C" />
      <g stroke="#E0A93C" strokeWidth="4" strokeLinecap="round">
        <line x1="180" y1="18" x2="180" y2="6" />
        <line x1="214" y1="60" x2="226" y2="60" />
        <line x1="205" y1="35" x2="214" y2="26" />
        <line x1="205" y1="85" x2="214" y2="94" />
      </g>
      <rect x="0" y="200" width="240" height="40" fill="#EAF3E6" />
      <rect x="112" y="150" width="14" height="55" rx="4" fill="#B08968" />
      <circle cx="119" cy="135" r="34" fill="#8FBF8F" />
      <circle cx="92" cy="150" r="24" fill="#8FBF8F" />
      <circle cx="146" cy="150" r="24" fill="#8FBF8F" />
      <path d="M0 215 C 60 205 120 225 240 210 L240 240 L0 240 Z" fill="#9CC9D6" />
      <path d="M0 222 C 70 214 150 230 240 220" stroke="#BFE0E8" strokeWidth="3" fill="none" />
    </svg>
  );
}

function AutumnArt() {
  return (
    <svg viewBox="0 0 240 240" className="w-full h-full" fill="none">
      <path d="M30 60 C 90 90 150 110 210 150" stroke="#9C6B3F" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M120 100 C 140 80 160 78 175 70" stroke="#9C6B3F" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M150 118 C 130 110 110 112 95 108" stroke="#9C6B3F" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M175 70 q 12 -10 22 -2 q -8 12 -22 2 Z" fill="#C98A3E" />
      <path d="M95 108 q -12 -8 -22 0 q 8 12 22 0 Z" fill="#B5612E" />
      <path d="M70 150 q 10 -9 20 -1 q -7 11 -20 1 Z" fill="#C98A3E" transform="rotate(20 80 150)" />
      <path d="M150 175 q 10 -9 20 -1 q -7 11 -20 1 Z" fill="#B5612E" transform="rotate(-15 160 175)" />
      <path d="M100 200 q 9 -8 18 -1 q -6 10 -18 1 Z" fill="#D89A4E" transform="rotate(35 109 200)" />
    </svg>
  );
}

function WinterArt() {
  const snow: [number, number][] = [
    [40, 50], [80, 90], [120, 40], [160, 80], [200, 55],
    [60, 130], [140, 120], [190, 140], [100, 170], [30, 100],
  ];
  return (
    <svg viewBox="0 0 240 240" className="w-full h-full" fill="none">
      <rect x="0" y="195" width="240" height="45" rx="8" fill="#E4EEF4" />
      <path d="M120 195 L120 120" stroke="#9AA7AE" strokeWidth="6" strokeLinecap="round" />
      <path d="M120 150 L95 120" stroke="#9AA7AE" strokeWidth="4" strokeLinecap="round" />
      <path d="M120 140 L148 112" stroke="#9AA7AE" strokeWidth="4" strokeLinecap="round" />
      <path d="M120 165 L102 150" stroke="#9AA7AE" strokeWidth="3" strokeLinecap="round" />
      <path d="M120 160 L140 148" stroke="#9AA7AE" strokeWidth="3" strokeLinecap="round" />
      {snow.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill="#FFFFFF" stroke="#D6E2EA" strokeWidth="1" />
      ))}
    </svg>
  );
}

export function SeasonArt({ season }: { season: Season }) {
  switch (season) {
    case "spring":
      return <SpringArt />;
    case "summer":
      return <SummerArt />;
    case "autumn":
      return <AutumnArt />;
    case "winter":
      return <WinterArt />;
    default:
      return <SpringArt />;
  }
}
