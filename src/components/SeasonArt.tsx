import { Season } from "@/lib/season";

const seasonText = {
  spring: "春",
  summer: "夏",
  autumn: "秋",
  winter: "冬",
};

function SeasonChar({ s }: { s: Season }) {
  return (
    <text
      x="340"
      y="72"
      textAnchor="end"
      className="fill-deco/40"
      style={{ fontFamily: "'KaiTi','STKaiti','SimKai',serif", fontSize: 56, fontWeight: 400, letterSpacing: 4 }}
    >
      {seasonText[s]}
    </text>
  );
}

function SpringArt() {
  return (
    <svg viewBox="0 0 380 260" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 远山 */}
      <path d="M0 230 C 70 205 150 215 220 200 C 290 185 340 195 380 180 L 380 260 L 0 260 Z" fill="#E3F0E2" />
      <path d="M220 200 C 290 185 340 195 380 180 L 380 260 L 220 260 Z" fill="#D4E8D2" />
      {/* 草地小径 */}
      <path d="M0 260 C 90 245 170 248 260 235 C 320 226 360 230 380 225 L 380 260 L 0 260 Z" fill="#CBE6C9" />
      <path d="M60 260 C 110 252 150 254 190 250 C 240 245 280 248 320 242" stroke="#B8DDB5" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* 骑车小人 */}
      <g transform="translate(86 208) scale(0.85)">
        <circle cx="18" cy="26" r="10" fill="#7FB77E" />
        <circle cx="58" cy="26" r="10" fill="#7FB77E" />
        <path d="M18 26 L 34 8 L 50 26" stroke="#5E8A5D" strokeWidth="2.5" fill="none" />
        <path d="M34 8 L 38 0" stroke="#5E8A5D" strokeWidth="2.5" />
        <circle cx="38" cy="0" r="4" fill="#F6D98A" />
        <path d="M30 26 L 38 8" stroke="#5E8A5D" strokeWidth="2" fill="none" />
        <path d="M30 26 L 50 26" stroke="#5E8A5D" strokeWidth="2" />
      </g>
      {/* 右上方花枝 */}
      <g transform="translate(220 -10)">
        <path d="M160 0 C 130 40 110 90 120 150" stroke="#9C7A6B" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d="M120 150 C 100 170 80 165 70 155" stroke="#9C7A6B" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M120 120 C 145 125 165 115 180 100" stroke="#9C7A6B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M122 90 C 100 80 80 90 70 105" stroke="#9C7A6B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {/* 花苞 */}
        <circle cx="120" cy="150" r="7" fill="#F3C6D3" />
        <circle cx="70" cy="155" r="6" fill="#F3C6D3" />
        <circle cx="180" cy="100" r="7" fill="#F3C6D3" />
        <circle cx="70" cy="105" r="6" fill="#F3C6D3" />
        <circle cx="135" cy="60" r="8" fill="#F5B4C6" />
        <circle cx="150" cy="85" r="7" fill="#F3C6D3" />
        <circle cx="105" cy="115" r="7" fill="#F5B4C6" />
        {/* 叶子 */}
        <ellipse cx="132" cy="45" rx="7" ry="3" fill="#A8D5A4" transform="rotate(-25 132 45)" />
        <ellipse cx="170" cy="115" rx="7" ry="3" fill="#A8D5A4" transform="rotate(35 170 115)" />
      </g>
      {/* 燕子 */}
      <g transform="translate(160 58)">
        <path d="M0 0 C 8 -6 18 -4 24 0 C 18 4 8 6 0 0 Z" fill="#5A6B6A" />
        <path d="M-10 -2 C -4 -8 4 -6 8 -2" stroke="#5A6B6A" strokeWidth="2" fill="none" />
        <path d="M24 0 C 30 -4 36 -2 40 0" stroke="#5A6B6A" strokeWidth="2" fill="none" />
      </g>
      <SeasonChar s="spring" />
    </svg>
  );
}

function SummerArt() {
  return (
    <svg viewBox="0 0 380 260" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 天空到海面渐变用纯色块 */}
      <rect x="0" y="0" width="380" height="260" fill="#EAF5F8" />
      {/* 海面 */}
      <path d="M0 175 C 60 170 130 180 200 173 C 270 166 320 172 380 168 L 380 260 L 0 260 Z" fill="#B8DCE8" />
      <path d="M0 185 C 70 181 140 189 210 183 C 280 177 330 182 380 179" stroke="#FFFFFF" strokeWidth="2" fill="none" opacity="0.6" />
      <path d="M0 205 C 80 200 160 210 240 203 C 300 198 350 202 380 200" stroke="#FFFFFF" strokeWidth="2" fill="none" opacity="0.5" />
      {/* 帆船 */}
      <g transform="translate(148 108)">
        <path d="M40 70 L 80 70 L 70 85 L 30 85 Z" fill="#FFFFFF" />
        <path d="M58 12 L 58 70" stroke="#9C7A6B" strokeWidth="2.5" />
        <path d="M58 18 L 58 62 L 88 62 C 80 42 68 26 58 18 Z" fill="#E8C87A" />
        <path d="M58 24 L 58 62 L 28 62 C 36 46 48 32 58 24 Z" fill="#7FB77E" />
      </g>
      {/* 海鸥 */}
      <g transform="translate(260 64)">
        <path d="M0 0 C 8 -8 18 -4 24 0 C 18 4 8 8 0 0" stroke="#8AA3AD" strokeWidth="2" fill="none" />
      </g>
      <g transform="translate(290 48)">
        <path d="M0 0 C 6 -6 14 -3 18 0 C 14 3 6 6 0 0" stroke="#8AA3AD" strokeWidth="1.8" fill="none" />
      </g>
      <g transform="translate(100 78)">
        <path d="M0 0 C 6 -5 12 -3 16 0 C 12 3 6 5 0 0" stroke="#8AA3AD" strokeWidth="1.6" fill="none" opacity="0.7" />
      </g>
      {/* 远景小岛 */}
      <path d="M60 175 C 80 160 110 158 130 175 Z" fill="#D4E8D2" />
      <SeasonChar s="summer" />
    </svg>
  );
}

function AutumnArt() {
  return (
    <svg viewBox="0 0 380 260" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="380" height="260" fill="#FAF6F0" />
      {/* 远山 */}
      <path d="M0 230 C 80 200 160 215 230 195 C 300 175 350 185 380 175 L 380 260 L 0 260 Z" fill="#EDE4D6" />
      <path d="M230 195 C 300 175 350 185 380 175 L 380 260 L 230 260 Z" fill="#E4D8C8" />
      {/* 火车轨道与列车 */}
      <g transform="translate(0 222)">
        <line x1="0" y1="10" x2="380" y2="10" stroke="#BFAE98" strokeWidth="2" />
        <line x1="0" y1="18" x2="380" y2="18" stroke="#BFAE98" strokeWidth="2" />
        <line x1="20" y1="8" x2="20" y2="20" stroke="#C9B9A4" strokeWidth="3" />
        <line x1="70" y1="8" x2="70" y2="20" stroke="#C9B9A4" strokeWidth="3" />
        <line x1="120" y1="8" x2="120" y2="20" stroke="#C9B9A4" strokeWidth="3" />
        <line x1="170" y1="8" x2="170" y2="20" stroke="#C9B9A4" strokeWidth="3" />
      </g>
      <g transform="translate(78 188)">
        <rect x="0" y="0" width="110" height="30" rx="6" fill="#E8A75A" />
        <rect x="8" y="6" width="20" height="12" rx="2" fill="#FFF8EF" opacity="0.8" />
        <rect x="34" y="6" width="20" height="12" rx="2" fill="#FFF8EF" opacity="0.8" />
        <rect x="60" y="6" width="20" height="12" rx="2" fill="#FFF8EF" opacity="0.8" />
        <circle cx="20" cy="30" r="6" fill="#5A4A3E" />
        <circle cx="90" cy="30" r="6" fill="#5A4A3E" />
        <path d="M110 8 L 120 4 L 120 26 L 110 22 Z" fill="#D9904A" />
      </g>
      {/* 右上落叶枝 */}
      <g transform="translate(210 -10)">
        <path d="M170 0 C 130 40 110 90 120 150" stroke="#9C7A6B" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d="M120 150 C 95 165 75 160 65 150" stroke="#9C7A6B" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M120 115 C 150 120 175 105 190 88" stroke="#9C7A6B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M122 80 C 95 70 72 82 60 98" stroke="#9C7A6B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {/* 叶子 */}
        <ellipse cx="135" cy="55" rx="9" ry="4" fill="#D89A4E" transform="rotate(-25 135 55)" />
        <ellipse cx="170" cy="100" rx="9" ry="4" fill="#C98A3E" transform="rotate(35 170 100)" />
        <ellipse cx="85" cy="120" rx="8" ry="4" fill="#D89A4E" transform="rotate(-15 85 120)" />
        <ellipse cx="105" cy="145" rx="8" ry="4" fill="#B5612E" transform="rotate(20 105 145)" />
        <ellipse cx="150" cy="30" rx="8" ry="4" fill="#C98A3E" transform="rotate(10 150 30)" />
      </g>
      {/* 飘落的叶子 */}
      <ellipse cx="60" cy="120" rx="5" ry="3" fill="#D89A4E" transform="rotate(40 60 120)" />
      <ellipse cx="200" cy="155" rx="5" ry="3" fill="#C98A3E" transform="rotate(-30 200 155)" />
      <ellipse cx="320" cy="130" rx="5" ry="3" fill="#B5612E" transform="rotate(20 320 130)" />
      <SeasonChar s="autumn" />
    </svg>
  );
}

function WinterArt() {
  return (
    <svg viewBox="0 0 380 260" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="380" height="260" fill="#F0F4F7" />
      {/* 远山 */}
      <path d="M0 225 C 70 195 150 210 220 190 C 290 170 340 180 380 170 L 380 260 L 0 260 Z" fill="#E4EEF4" />
      <path d="M220 190 C 290 170 340 180 380 170 L 380 260 L 220 260 Z" fill="#D8E5EC" />
      {/* 雪地 */}
      <path d="M0 245 C 80 235 170 250 260 238 C 330 229 370 235 380 232 L 380 260 L 0 260 Z" fill="#FFFFFF" />
      {/* 小屋 */}
      <g transform="translate(228 176)">
        <rect x="10" y="28" width="54" height="42" rx="3" fill="#F7F9FA" />
        <path d="M0 28 L 37 0 L 74 28 Z" fill="#9FB8C9" />
        <rect x="26" y="42" width="16" height="28" rx="2" fill="#D8A67B" />
        <rect x="30" y="46" width="8" height="10" rx="1" fill="#FFF4E6" />
        <circle cx="42" cy="64" r="1.5" fill="#8A6A50" />
        {/* 烟囱与烟 */}
        <rect x="50" y="8" width="8" height="14" fill="#C9D6DE" />
        <circle cx="54" cy="4" r="3" fill="#C9D6DE" opacity="0.7" />
        <circle cx="58" cy="-2" r="4" fill="#C9D6DE" opacity="0.5" />
      </g>
      {/* 左侧枯枝 */}
      <g transform="translate(0 10)">
        <path d="M120 250 C 110 200 100 150 120 100" stroke="#9AA7AE" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M120 150 C 100 130 80 135 70 145" stroke="#9AA7AE" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M120 120 C 140 105 160 110 175 120" stroke="#9AA7AE" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M120 180 C 95 170 75 180 65 195" stroke="#9AA7AE" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
      {/* 雪花 */}
      <circle cx="50" cy="50" r="3" fill="#FFFFFF" stroke="#D6E2EA" strokeWidth="1" />
      <circle cx="160" cy="80" r="2.5" fill="#FFFFFF" stroke="#D6E2EA" strokeWidth="1" />
      <circle cx="280" cy="55" r="3" fill="#FFFFFF" stroke="#D6E2EA" strokeWidth="1" />
      <circle cx="340" cy="110" r="2.5" fill="#FFFFFF" stroke="#D6E2EA" strokeWidth="1" />
      <circle cx="100" cy="140" r="2" fill="#FFFFFF" stroke="#D6E2EA" strokeWidth="1" />
      <SeasonChar s="winter" />
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
