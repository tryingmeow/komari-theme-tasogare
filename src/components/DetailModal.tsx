import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LatestStatus, LoadRecord, NodeInfo, PingRecord, PingTask } from "../lib/api";
import { getPingRecords, getPingTasks, getRecords } from "../lib/api";
import { daysUntil, fmtBytes, fmtDate, fmtPercent, fmtSpeed, fmtTime, fmtUptime } from "../lib/format";
import { fmtCycle, fmtDaysLeft, t } from "../lib/i18n";
import { osIcon } from "../lib/osIcon";
import Flag from "./Flag";

interface Props {
  node: NodeInfo;
  status?: LatestStatus;
  mode: "day" | "night";
  onClose: () => void;
}

const RANGES = [
  { label: "1h", hours: 1 },
  { label: "6h", hours: 6 },
  { label: "24h", hours: 24 },
  { label: "7d", hours: 168 },
];

const PING_COLORS = ["#818cf8", "#f472b6", "#2dd4bf", "#fbbf24", "#fb7185", "#a3e635"];

function GlassTooltip({
  active,
  payload,
  label,
  fmt,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  fmt: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-xl px-3 py-2 text-[12px]">
      <div className="text-dim mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-1.5 num">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <b>{fmt(p.value)}</b>
        </div>
      ))}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-3.5" style={{ background: "var(--chip)", border: "1px solid var(--glass-border)" }}>
      <div className="text-[13px] font-semibold mb-2">{title}</div>
      <div className="h-[180px]">{children}</div>
    </div>
  );
}

function MetaItem({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] text-dim">{k}</div>
      <div className="text-[13px] font-medium truncate" title={v}>{v}</div>
    </div>
  );
}

export default function DetailModal({ node, status, mode, onClose }: Props) {
  const [hours, setHours] = useState(6);
  const [records, setRecords] = useState<LoadRecord[] | null>(null);
  const [pingData, setPingData] = useState<{ tasks: PingTask[]; records: PingRecord[] } | null>(null);

  const axis = mode === "day" ? "rgba(38,44,74,0.45)" : "rgba(233,236,255,0.45)";
  const grid = mode === "day" ? "rgba(38,44,74,0.10)" : "rgba(233,236,255,0.10)";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    let gone = false;
    setRecords(null);
    getRecords(node.uuid, hours)
      .then((d) => !gone && setRecords(d.records || []))
      .catch(() => !gone && setRecords([]));
    Promise.all([getPingTasks(), getPingRecords(node.uuid, hours)])
      .then(([tasks, pr]) => {
        if (gone) return;
        setPingData({ tasks: pr.tasks?.length ? pr.tasks : tasks || [], records: pr.records || [] });
      })
      .catch(() => !gone && setPingData({ tasks: [], records: [] }));
    return () => {
      gone = true;
    };
  }, [node.uuid, hours]);

  const loadData = useMemo(
    () =>
      // records may arrive out of order; charts need chronological order
      [...(records || [])]
        .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
        .map((r) => ({
        time: fmtTime(r.time, hours),
        cpu: Math.min(100, r.cpu),
        ram: fmtPercent(r.ram, r.ram_total || node.mem_total),
        up: r.net_out,
        down: r.net_in,
      })),
    [records, hours, node.mem_total],
  );

  const pingSeries = useMemo(() => {
    if (!pingData || !pingData.records.length) return { data: [], tasks: [] as PingTask[] };
    // records arrive newest-first; charts need chronological order
    const sorted = [...pingData.records].sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
    );
    const byTime = new Map<string, Record<string, number | string>>();
    const taskIds = new Set<number>();
    for (const r of sorted) {
      taskIds.add(r.task_id);
      const key = fmtTime(r.time, hours);
      if (!byTime.has(key)) byTime.set(key, { time: key });
      // value <= 0 means the probe failed; keep the gap instead of plotting 0
      if (r.value > 0) byTime.get(key)![`t${r.task_id}`] = r.value;
    }
    const tasks = (pingData.tasks || []).filter((tk) => taskIds.has(tk.id));
    return { data: Array.from(byTime.values()), tasks };
  }, [pingData, hours]);

  const pct = (v: number) => `${v.toFixed(1)}%`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center fadein"
      style={{ background: mode === "day" ? "rgba(60,60,90,0.25)" : "rgba(0,0,10,0.5)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="glass-strong rounded-t-3xl sm:rounded-3xl w-full sm:w-[min(880px,94vw)] max-h-[92vh] sm:max-h-[88vh] overflow-y-auto p-5 sm:p-6 pop">
        {/* header */}
        <div className="flex items-center gap-2.5 mb-4">
          <Flag region={node.region} size={30} />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[18px] truncate">{node.name}</div>
            <div className="flex items-center gap-1.5 text-[12px] text-dim truncate">
              <img src={osIcon(node.os)} alt="" width={14} height={14} className="shrink-0 opacity-90" />
              <span className="truncate">
                {node.os} · {node.arch}
                {status?.online && <> · {t("uptime")} {fmtUptime(status.uptime, t)}</>}
              </span>
            </div>
          </div>
          <span className={`w-2.5 h-2.5 rounded-full ${status?.online ? "dot-online" : "dot-offline"}`} />
          <button
            onClick={onClose}
            className="ml-1 w-8 h-8 rounded-full grid place-items-center cursor-pointer hover:opacity-70 transition-opacity"
            style={{ background: "var(--chip)", border: "1px solid var(--glass-border)" }}
            aria-label="close"
          >
            ✕
          </button>
        </div>

        {/* meta */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 rounded-2xl p-3.5" style={{ background: "var(--chip)", border: "1px solid var(--glass-border)" }}>
          <MetaItem k="CPU" v={`${node.cpu_name} ×${node.cpu_cores}`} />
          <MetaItem k={t("virtualization")} v={`${node.virtualization || "-"} / ${node.arch}`} />
          <MetaItem k={t("ram")} v={fmtBytes(node.mem_total)} />
          <MetaItem k={t("disk")} v={fmtBytes(node.disk_total)} />
          {node.price !== 0 && (
            <MetaItem
              k={t("price")}
              v={node.price < 0 ? t("free") : `${node.currency || "$"}${node.price} / ${fmtCycle(node.billing_cycle)}`}
            />
          )}
          {daysUntil(node.expired_at) !== null && (
            <MetaItem
              k={t("expire")}
              v={`${fmtDate(node.expired_at!)} · ${daysUntil(node.expired_at)! < 0 ? t("expired") : fmtDaysLeft(daysUntil(node.expired_at)!)}`}
            />
          )}
          {status?.online && (
            <>
              <MetaItem k={t("load")} v={`${status.load.toFixed(2)} / ${status.load5.toFixed(2)} / ${status.load15.toFixed(2)}`} />
              <MetaItem k={t("connections")} v={`${t("tcp")} ${status.connections} · ${t("udp")} ${status.connections_udp}`} />
              <MetaItem k={t("processes")} v={String(status.process)} />
              <MetaItem k={t("traffic")} v={`↑ ${fmtBytes(status.net_total_up)} ↓ ${fmtBytes(status.net_total_down)}`} />
            </>
          )}
        </div>

        {/* range tabs */}
        <div className="flex gap-1.5 mb-3">
          {RANGES.map((r) => (
            <button
              key={r.hours}
              onClick={() => setHours(r.hours)}
              className="px-3.5 py-1.5 rounded-full text-[12.5px] font-medium cursor-pointer transition-all num"
              style={
                hours === r.hours
                  ? { background: "var(--accent)", color: "#fff", border: "1px solid transparent" }
                  : { background: "var(--chip)", border: "1px solid var(--glass-border)" }
              }
            >
              {r.label}
            </button>
          ))}
        </div>

        {records === null ? (
          <div className="text-center text-dim py-16">{t("loading")}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ChartCard title={`${t("cpu")} %`}>
              <ResponsiveContainer>
                <AreaChart data={loadData} margin={{ top: 4, right: 4, left: -14, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gcpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818cf8" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#818cf8" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={grid} vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: axis, fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={38} />
                  <YAxis domain={[0, 100]} tick={{ fill: axis, fontSize: 10 }} tickLine={false} axisLine={false} width={38} />
                  <Tooltip content={<GlassTooltip fmt={pct} />} />
                  <Area type="monotone" dataKey="cpu" name="CPU" stroke="#818cf8" strokeWidth={2} fill="url(#gcpu)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title={`${t("ram")} %`}>
              <ResponsiveContainer>
                <AreaChart data={loadData} margin={{ top: 4, right: 4, left: -14, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gram" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f472b6" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#f472b6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={grid} vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: axis, fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={38} />
                  <YAxis domain={[0, 100]} tick={{ fill: axis, fontSize: 10 }} tickLine={false} axisLine={false} width={38} />
                  <Tooltip content={<GlassTooltip fmt={pct} />} />
                  <Area type="monotone" dataKey="ram" name={t("ram")} stroke="#f472b6" strokeWidth={2} fill="url(#gram)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title={t("netChart")}>
              <ResponsiveContainer>
                <LineChart data={loadData} margin={{ top: 4, right: 4, left: -6, bottom: 0 }}>
                  <CartesianGrid stroke={grid} vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: axis, fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={38} />
                  <YAxis tick={{ fill: axis, fontSize: 10 }} tickLine={false} axisLine={false} width={52} tickFormatter={(v: number) => fmtBytes(v)} />
                  <Tooltip content={<GlassTooltip fmt={fmtSpeed} />} />
                  <Line type="monotone" dataKey="up" name={`↑ ${t("upload")}`} stroke="#fb7185" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="down" name={`↓ ${t("download")}`} stroke="#2dd4bf" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title={t("latency")}>
              {pingSeries.data.length && pingSeries.tasks.length ? (
                <ResponsiveContainer>
                  <LineChart data={pingSeries.data} margin={{ top: 4, right: 4, left: -14, bottom: 0 }}>
                    <CartesianGrid stroke={grid} vertical={false} />
                    <XAxis dataKey="time" tick={{ fill: axis, fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={38} />
                    <YAxis domain={[0, "auto"]} tick={{ fill: axis, fontSize: 10 }} tickLine={false} axisLine={false} width={38} tickFormatter={(v: number) => `${v}`} />
                    <Tooltip content={<GlassTooltip fmt={(v) => `${Math.round(v)} ms`} />} />
                    <Legend
                      iconType="plainline"
                      iconSize={14}
                      wrapperStyle={{ fontSize: 11, color: axis }}
                    />
                    {pingSeries.tasks.map((task, i) => (
                      <Line
                        key={task.id}
                        type="monotone"
                        dataKey={`t${task.id}`}
                        name={task.name}
                        stroke={PING_COLORS[i % PING_COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                        isAnimationActive={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full grid place-items-center text-dim text-[13px]">{t("noPingTasks")}</div>
              )}
            </ChartCard>
          </div>
        )}
      </div>
    </div>
  );
}
