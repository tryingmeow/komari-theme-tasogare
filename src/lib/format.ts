const UNITS = ["B", "KB", "MB", "GB", "TB", "PB"];

export function fmtBytes(n: number, digits = 1): string {
  if (!n || n <= 0) return "0 B";
  let i = 0;
  while (n >= 1024 && i < UNITS.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 100 || i === 0 ? 0 : digits)} ${UNITS[i]}`;
}

export function fmtSpeed(bps: number): string {
  return `${fmtBytes(bps)}/s`;
}

export function fmtPercent(used: number, total: number): number {
  if (!total) return 0;
  return Math.min(100, (used / total) * 100);
}

export function fmtUptime(
  sec: number,
  t: (k: "day" | "hour" | "min") => string,
): string {
  if (!sec || sec < 0) return "-";
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}${t("day")} ${h}${t("hour")}`;
  if (h > 0) return `${h}${t("hour")} ${m}${t("min")}`;
  return `${m}${t("min")}`;
}

// "Debian GNU/Linux 13 (trixie)" → "Debian 13", "Alpine Linux v3.19" → "Alpine 3.19"
export function shortOs(os: string): string {
  if (!os) return "-";
  return os
    .replace(/\s*\(.*?\)/g, "")
    .replace(/GNU\/Linux\s*/i, "")
    .replace(/\s+Linux\s+v?/i, " ")
    .trim();
}

// traffic usage per komari's traffic_limit_type semantics: sum max min up down
export function trafficUsed(up: number, down: number, type: string): number {
  switch (type) {
    case "min":
      return Math.min(up, down);
    case "sum":
      return up + down;
    case "up":
      return up;
    case "down":
      return down;
    default:
      return Math.max(up, down); // backend default is "max"
  }
}

// days until expiry; null when unset (backend sends null or a zero-value date)
export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime()) || d.getFullYear() < 2000) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function fmtTime(iso: string, hours: number): string {
  const d = new Date(iso);
  if (hours > 48) {
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:00`;
  }
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
