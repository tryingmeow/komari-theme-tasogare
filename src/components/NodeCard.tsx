import type { LatestStatus, NodeInfo } from "../lib/api";
import { daysUntil, fmtBytes, fmtPercent, fmtSpeed, fmtUptime, shortOs, trafficUsed } from "../lib/format";
import { fmtDaysLeft, t } from "../lib/i18n";
import { osIcon } from "../lib/osIcon";
import Flag from "./Flag";

interface Props {
  node: NodeInfo;
  status?: LatestStatus;
  index: number;
  showLatency: boolean;
  onClick: () => void;
}

// latency tiers: green = fast, amber = medium, rose = slow
const pingColor = (ms: number) => (ms < 100 ? "#34d399" : ms < 200 ? "#fbbf24" : "#fb7185");

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

  const pingStats = status
    ? Object.values(status.ping || {}).filter((p) => p.avg > 0)
    : [];
  const avgPing = pingStats.length
    ? Math.round(pingStats.reduce((a, b) => a + b.avg, 0) / pingStats.length)
    : null;

  const trafficLimit = node.traffic_limit || 0;
  const trafficUse = status ? trafficUsed(status.net_total_up, status.net_total_down, node.traffic_limit_type) : 0;
  const trafficPct = trafficLimit > 0 ? Math.min(100, (trafficUse / trafficLimit) * 100) : 0;
  const trafficStyle = trafficPct >= 90 ? GRADS.trafficHot : GRADS.traffic;

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
            <span className="text-dim flex items-center">
              {showLatency && avgPing !== null && (
                <span className="relative group mr-2">
                  <span className="font-medium" style={{ color: pingColor(avgPing) }}>
                    {avgPing}ms
                  </span>
                  {/* per-ISP breakdown on hover */}
                  <span className="hidden group-hover:flex flex-col gap-1 absolute bottom-full right-0 mb-2 z-20 glass-strong rounded-xl px-3 py-2 whitespace-nowrap text-left">
                    {pingStats.map((p) => (
                      <span key={p.name} className="flex items-center gap-2 text-[11.5px]">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: pingColor(p.avg) }}
                        />
                        <span style={{ color: "var(--text)" }}>{p.name}</span>
                        <span className="ml-auto font-medium" style={{ color: pingColor(p.avg) }}>
                          {Math.round(p.avg)}ms
                        </span>
                        <span className="text-dim">
                          {t("loss")} {Math.round(p.loss)}%
                        </span>
                      </span>
                    ))}
                  </span>
                </span>
              )}
              ⏱ {fmtUptime(status.uptime, t)}
            </span>
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
    </button>
  );
}
