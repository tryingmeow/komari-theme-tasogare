import { useState } from "react";

// 🇭🇰 → "HK": two regional-indicator codepoints map back to ASCII letters
const RI_START = 0x1f1e6;
function emojiToCode(flag: string): string | null {
  const chars = Array.from(flag);
  if (chars.length !== 2) return null;
  const a = chars[0].codePointAt(0)!;
  const b = chars[1].codePointAt(0)!;
  if (a >= RI_START && a <= 0x1f1ff && b >= RI_START && b <= 0x1f1ff) {
    return String.fromCharCode(a - RI_START + 65, b - RI_START + 65);
  }
  return null;
}

function resolveCode(region: string): string | null {
  if (!region) return null;
  const fromEmoji = emojiToCode(region);
  if (fromEmoji) return fromEmoji;
  if (/^[a-zA-Z]{2}$/.test(region)) return region.toUpperCase();
  if (region === "🇺🇳" || region === "🌐") return "UN";
  return null;
}

// SVG flag image (Windows renders flag emojis as plain letters, so emoji
// alone isn't enough); falls back to the raw region text if the asset 404s.
export default function Flag({ region, size = 20 }: { region: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const code = resolveCode(region);
  if (!code || failed) {
    return (
      <span style={{ fontSize: size * 0.85, lineHeight: 1 }}>{region || "🏳️"}</span>
    );
  }
  return (
    <img
      src={`/assets/flags/${code}.svg`}
      alt={code}
      width={size}
      height={size}
      loading="lazy"
      className="shrink-0"
      style={{ display: "inline-block" }}
      onError={() => setFailed(true)}
    />
  );
}
