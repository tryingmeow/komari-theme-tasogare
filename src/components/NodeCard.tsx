import { useEffect, useState } from "react";
import type { LatestStatus, NodeInfo, PingRecord } from "../lib/api";
import { getPingRecords } from "../lib/api";
import { daysUntil, fmtBytes, fmtPercent, fmtSpeed, fmtUptime, shortOs, trafficUsed } from "../lib/format";
import { fmtDaysLeft, t } from "../lib/i18n";
import { osIcon } from "../lib/osIcon";
import { TIER_COLORS, lossColor, pingColor, pingFace, pingTier } from "../lib/ping";
import Flag from "./Flag";

interface Props {
  node: NodeInfo;
  status?: LatestStatus;
  index: number;
  showLatency: boolean;
  onClick: () => void;
}

// subtle 3D tilt, mouse-only
const canTilt =
  typeof window !== "undefined" &&
  window.matchMedia("(pointer: fine)").matches &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function tiltMove(e: React.MouseEvent<HTMLButtonElement>) {
  if (!canTilt) return;
  const r = e.currentTarget.getBoundingClientRect();
  const px = (e.clientX - r.left) / r.width - 0.5;
  const py = (e.clientY - r.top) / r.height - 0.5;
  e.currentTarget.style.transform = `perspective(900px) rotateX(${(-py * 3.5).toFixed(2)}deg) rotateY(${(px * 4.5).toFixed(2)}deg) translateY(-4px)`;
}

function tiltLeave(e: React.MouseEvent<HTMLButtonElement>) {
  e.currentTarget.style.transform = "";
}

// quality strip: recent ping history condensed into one thin segmented bar
const STRIP_HOURS = 4;
const STRIP_BUCKETS = 30;
const STRIP_REFRESH = 5 * 60_000;

interface StripSeg {
  tier: number;
  ms: number; // 0 = every probe failed in this window
  loss: number;
  from: number;
  to: number;
}

const fmtHM = (ts: number) => {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

function bucketize(records: PingRecord[]): (StripSeg | null)[] | null {
  const now = Date.now();
  const span = STRIP_HOURS * 3600_000;
  const start = now - span;
  const bucketMs = span / STRIP_BUCKETS;
  const buckets = Array.from({ length: STRIP_BUCKETS }, () => ({ sum: 0, ok: 0, total: 0 }));
  for (const r of records) {
    const ts = new Date(r.time).getTime();
    if (ts < start || ts > now) continue;
    const i = Math.min(STRIP_BUCKETS - 1, Math.floor(((ts - start) / span) * STRIP_BUCKETS));
    const b = buckets[i];
    b.total++;
    if (r.value > 0) {
      b.sum += r.value;
      b.ok++;
    }
  }
  if (buckets.every((b) => b.total === 0)) return null;
  return buckets.map((b, i) => {
    if (!b.total) return null;
    const loss = Math.round(((b.total - b.ok) / b.total) * 100);
    const ms = b.ok ? Math.round(b.sum / b.ok) : 0;
    return {
      tier: b.ok ? pingTier(ms, loss) : 2,
      ms,
      loss,
      from: start + i * bucketMs,
      to: start + (i + 1) * bucketMs,
    };
  });
}

function useQualityStrip(uuid: string, enabled: boolean, index: number) {
  const [segs, setSegs] = useState<(StripSeg | null)[] | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let stop = false;
    let timer: number | undefined;
    const load = async () => {
      if (stop) return;
      try {
        const d = await getPingRecords(uuid, STRIP_HOURS);
        if (stop) return;
        setSegs(bucketize(d.records || []));
      } catch {
        /* transient error: keep last strip */
      }
      timer = window.setTimeout(load, STRIP_REFRESH);
    };
    // stagger initial fetches so a large grid doesn't burst the API
    timer = window.setTimeout(load, Math.min(index * 120, 2000));
    return () => {
      stop = true;
      window.clearTimeout(timer);
    };
  }, [uuid, enabled, index]);
  return segs;
}

const GRADS = {
  cpu: { grad: "linear-gradient(90deg,#818cf8,#a78bfa)", color: "#8b7cf6" },
  ram: { grad: "linear-gradient(90deg,#f472b6,#fb7185)", color: "#f4649e" },
  disk: { grad: "linear-gradient(90deg,#fbbf24,#fb923c)", color: "#f59e2b" },
  traffic: { grad: "linear-gradient(90deg,#38bdf8,#2dd4bf)", color: "#14b8c6" },
  trafficHot: { grad: "linear-gradient(90deg,#fb7185,#f43f5e)", color: "#f43f5e" },
};

function Bar({
  label,
  pct,
  grad,
  color,
  sub,
}: {
  label: string;
  pct: number;
  grad: string;
  color: string;
  sub?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[12px] text-dim">{label}</span>
        <span className="text-[13px] font-semibold num" style={{ color }}>
          {pct.toFixed(pct >= 10 ? 0 : 1)}%
          {sub && <span className="text-dim font-normal text-[11px]"> · {sub}</span>}
        </span>
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${pct}%`, background: grad }} />
      </div>
    </div>
  );
}

export default function NodeCard({ node, status, index, showLatency, onClick }: Props) {
  const online = !!status?.online;
  const cpu = status ? Math.min(100, status.cpu) : 0;
  const ramPct = status ? fmtPercent(status.ram, status.ram_total || node.mem_total) : 0;
  const diskPct = status ? fmtPercent(status.disk, status.disk_total || node.disk_total) : 0;

  const pingStats = status ? Object.values(status.ping || {}) : [];
  const measuredPing = pingStats.filter((p) => p.avg > 0);
  const avgPing = measuredPing.length
    ? Math.round(measuredPing.reduce((a, b) => a + b.avg, 0) / measuredPing.length)
    : null;
  const avgLoss = measuredPing.length
    ? measuredPing.reduce((a, b) => a + b.loss, 0) / measuredPing.length
    : 0;

  const trafficLimit = node.traffic_limit || 0;
  const trafficUse = status ? trafficUsed(status.net_total_up, status.net_total_down, node.traffic_limit_type) : 0;
  const trafficPct = trafficLimit > 0 ? Math.min(100, (trafficUse / trafficLimit) * 100) : 0;
  const trafficStyle = trafficPct >= 90 ? GRADS.trafficHot : GRADS.traffic;

  const strip = useQualityStrip(node.uuid, showLatency, index);
  const [stripHover, setStripHover] = useState<number | null>(null);
  const hoverSeg = strip && stripHover !== null ? strip[stripHover] : null;

  const expDays = daysUntil(node.expired_at);
  const expSoon = expDays !== null && expDays <= 15;

  const tags = (node.tags || "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);

  return (
    <button
      onClick={onClick}
      onMouseMove={tiltMove}
      onMouseLeave={tiltLeave}
      className={`glass rounded-[20px] p-4 text-left w-full card-hover rise cursor-pointer ${online ? "" : "offline-card"}`}
      style={{ animationDelay: `${Math.min(index * 55, 600)}ms` }}
    >
      {/* header */}
      <div className="flex items-center gap-2.5 mb-3.5">
        <Flag region={node.region} size={24} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[15px] truncate leading-tight">{node.name}</div>
          <div className="flex items-center gap-1 text-[11px] text-dim truncate mt-0.5">
            <img
              src={osIcon(node.os)}
              alt=""
              width={13}
              height={13}
              loading="lazy"
              className="shrink-0 opacity-90"
            />
            <span className="truncate">
              {shortOs(node.os)} · {node.arch}
            </span>
          </div>
        </div>
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${online ? "dot-online" : "dot-offline"}`}
        />
        <span className="text-[11px] text-dim">{online ? t("online") : t("offline")}</span>
      </div>

      {/* bars */}
      <div className="flex flex-col gap-2.5">
        <Bar label={t("cpu")} pct={online ? cpu : 0} grad={GRADS.cpu.grad} color={GRADS.cpu.color} />
        <Bar
          label={t("ram")}
          pct={online ? ramPct : 0}
          grad={GRADS.ram.grad}
          color={GRADS.ram.color}
          sub={online && status ? `${fmtBytes(status.ram)} / ${fmtBytes(status.ram_total || node.mem_total)}` : undefined}
        />
        <Bar
          label={t("disk")}
          pct={online ? diskPct : 0}
          grad={GRADS.disk.grad}
          color={GRADS.disk.color}
          sub={online && status ? `${fmtBytes(status.disk)} / ${fmtBytes(status.disk_total || node.disk_total)}` : undefined}
        />
        {trafficLimit > 0 && (
          <Bar
            label={t("traffic")}
            pct={online ? trafficPct : 0}
            grad={trafficStyle.grad}
            color={trafficStyle.color}
            sub={online && status ? `${fmtBytes(trafficUse)} / ${fmtBytes(trafficLimit)}` : undefined}
          />
        )}
      </div>

      {/* footer */}
      <div className="flex items-center justify-between mt-3.5 text-[12px] num">
        {online && status ? (
          <>
            <span>
              <span style={{ color: "#fb7185" }}>↑</span> {fmtSpeed(status.net_out)}{" "}
              <span style={{ color: "#2dd4bf" }}>↓</span> {fmtSpeed(status.net_in)}
            </span>
            <span className="text-dim">⏱ {fmtUptime(status.uptime, t)}</span>
          </>
        ) : (
          <span className="text-dim">{t("offline_hint")}</span>
        )}
      </div>

      {(tags.length > 0 || expSoon) && (
        <div className="flex gap-1.5 mt-2.5 flex-wrap">
          {expSoon && (
            <span
              className="text-[10.5px] px-2 py-0.5 rounded-full font-medium"
              style={{
                color: expDays! <= 3 ? "#fb7185" : "#f59e2b",
                background: "var(--chip)",
                border: `1px solid ${expDays! <= 3 ? "rgba(251,113,133,0.45)" : "rgba(245,158,43,0.45)"}`,
              }}
            >
              {expDays! < 0 ? t("expired") : fmtDaysLeft(expDays!)}
            </span>
          )}
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-[10.5px] px-2 py-0.5 rounded-full"
              style={{ background: "var(--chip)", border: "1px solid var(--glass-border)" }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* ping row: face + avg latency, quality strip of recent history, loss — one line for everything network */}
      {showLatency && online && pingStats.length > 0 && (
        <div className="flex items-center gap-2 mt-3 text-[12px] num">
          <span className="relative group cursor-default shrink-0">
            <span
              className="font-medium"
              style={{ color: avgPing !== null ? pingColor(avgPing, avgLoss) : "#fb7185" }}
            >
              {avgPing !== null ? `${pingFace(avgPing, avgLoss)} ${avgPing}ms` : t("ping_timeout")}
            </span>
            {/* per-ISP breakdown on hover */}
            <span className="hidden group-hover:flex flex-col gap-1 absolute bottom-full left-0 mb-2 z-20 glass-strong rounded-xl px-3 py-2 whitespace-nowrap text-left">
              {pingStats.map((p) => (
                <span key={p.name} className="flex items-center gap-2 text-[11.5px]">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: p.avg > 0 ? pingColor(p.avg, p.loss) : "#fb7185" }}
                  />
                  <span style={{ color: "var(--text)" }}>{p.name}</span>
                  <span
                    className="ml-auto font-medium"
                    style={{ color: p.avg > 0 ? pingColor(p.avg, p.loss) : "#fb7185" }}
                  >
                    {p.avg > 0 ? `${Math.round(p.avg)}ms` : t("ping_timeout")}
                  </span>
                  <span style={{ color: lossColor(p.loss) || "var(--text-dim)" }}>
                    {t("loss")} {Math.round(p.loss)}%
                  </span>
                </span>
              ))}
            </span>
          </span>

          {strip ? (
            <div className="relative flex-1" onMouseLeave={() => setStripHover(null)}>
              {hoverSeg && (
                <span className="flex items-center gap-2 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 glass-strong rounded-xl px-3 py-1.5 whitespace-nowrap text-[11.5px] num pointer-events-none">
                  <span className="text-dim">
                    {fmtHM(hoverSeg.from)}–{fmtHM(hoverSeg.to)}
                  </span>
                  <span className="w-px h-3" style={{ background: "var(--glass-border)" }} />
                  <span className="font-medium" style={{ color: TIER_COLORS[hoverSeg.tier] }}>
                    {hoverSeg.ms > 0 ? `${hoverSeg.ms}ms` : t("ping_timeout")}
                  </span>
                  <span className="w-px h-3" style={{ background: "var(--glass-border)" }} />
                  <span style={{ color: lossColor(hoverSeg.loss) || "var(--text-dim)" }}>
                    {t("loss")} {hoverSeg.loss}%
                  </span>
                </span>
              )}
              <div className="flex h-[3px] rounded-full overflow-hidden" aria-hidden>
                {strip.map((seg, i) => (
                  <span
                    key={i}
                    className="flex-1"
                    style={
                      seg === null
                        ? { background: "var(--chip)", opacity: 0.5 }
                        : {
                            background: TIER_COLORS[seg.tier],
                            opacity:
                              stripHover === i ? 1 : seg.tier === 0 ? 0.4 : seg.tier === 1 ? 0.55 : 0.8,
                          }
                    }
                  />
                ))}
              </div>
              {/* invisible hover targets, taller than the 3px ribbon for easier aiming */}
              <div className="absolute -top-[10px] -bottom-[10px] inset-x-0 flex z-10 cursor-pointer">
                {strip.map((seg, i) => (
                  <span
                    key={i}
                    className="flex-1"
                    onMouseEnter={() => setStripHover(seg ? i : null)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 h-[3px] rounded-full" style={{ background: "var(--chip)", opacity: 0.4 }} />
          )}

          <span className="shrink-0" style={{ color: lossColor(Math.round(avgLoss)) || "var(--text-dim)" }}>
            {Math.round(avgLoss)}%
          </span>
        </div>
      )}
    </button>
  );
}
