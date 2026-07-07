import { useEffect, useState } from "react";
import type { LatestStatus, NodeInfo } from "../lib/api";
import { fmtBytes, fmtSpeed } from "../lib/format";
import { t } from "../lib/i18n";

interface Props {
  nodes: NodeInfo[];
  latest: Record<string, LatestStatus>;
}

function Item({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[11px] tracking-wide text-dim">{label}</span>
      <span className="text-[15px] font-semibold num whitespace-nowrap">
        {children}
      </span>
    </div>
  );
}

export default function StatsBar({ nodes, latest }: Props) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const online = nodes.filter((n) => latest[n.uuid]?.online);
  const regions = new Set(nodes.map((n) => n.region || "🏳️")).size;
  let up = 0,
    down = 0,
    totalUp = 0,
    totalDown = 0;
  for (const n of nodes) {
    const s = latest[n.uuid];
    if (!s) continue;
    totalUp += s.net_total_up;
    totalDown += s.net_total_down;
    if (s.online) {
      up += s.net_out;
      down += s.net_in;
    }
  }

  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  return (
    <div className="glass rounded-2xl px-5 py-3.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-3">
      <Item label={t("currentTime")}>
        {hh}:{mm}
        <span className="text-dim">:{ss}</span>
      </Item>
      <Item label={t("currentOnline")}>
        <span style={{ color: "#34d399" }}>{online.length}</span>
        <span className="text-dim"> / {nodes.length}</span>
      </Item>
      <Item label={t("regions")}>{regions}</Item>
      <Item label={t("totalTraffic")}>
        <span className="text-dim text-[13px]">↑</span> {fmtBytes(totalUp)}{" "}
        <span className="text-dim text-[13px]">↓</span> {fmtBytes(totalDown)}
      </Item>
      <Item label={t("netSpeed")}>
        <span className="text-dim text-[13px]">↑</span> {fmtSpeed(up)}{" "}
        <span className="text-dim text-[13px]">↓</span> {fmtSpeed(down)}
      </Item>
    </div>
  );
}
