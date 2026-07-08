import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import type { LatestStatus, NodeInfo, PublicInfo } from "./lib/api";
import { getLatest, getNodes, getPublicInfo } from "./lib/api";
import { t } from "./lib/i18n";
import { setLossSensitivity } from "./lib/ping";
import Background from "./components/Background";
import StatsBar from "./components/StatsBar";
import NodeCard from "./components/NodeCard";

const DetailModal = lazy(() => import("./components/DetailModal"));

type Mode = "day" | "night";

const DEFAULT_WALL_DAY = "/wallpaper-day.svg";
const DEFAULT_WALL_NIGHT = "/wallpaper-night.svg";

function autoMode(tz: string): Mode {
  try {
    const h = Number(new Date().toLocaleString("en", { timeZone: tz, hour: "numeric", hour12: false }));
    return h >= 18 || h < 6 ? "night" : "day";
  } catch {
    return "day";
  }
}

function useMode(tz: string): [Mode, () => void] {
  const [mode, setMode] = useState<Mode>(() => {
    const m = autoMode(tz);
    document.documentElement.dataset.mode = m;
    return m;
  });
  useEffect(() => {
    const m = autoMode(tz);
    document.documentElement.dataset.mode = m;
    setMode(m);
  }, [tz]);
  const toggle = useCallback(() => {
    setMode((m) => {
      const next = m === "day" ? "night" : "day";
      document.documentElement.dataset.mode = next;
      return next;
    });
  }, []);
  return [mode, toggle];
}

export default function App() {
  const [pub, setPub] = useState<PublicInfo | null>(null);
  const tz = ((pub?.theme_settings ?? {}) as Record<string, unknown>).timezone as string || "Asia/Shanghai";
  const [mode, toggleMode] = useMode(tz);
  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  const [latest, setLatest] = useState<Record<string, LatestStatus>>({});
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string>("");
  const [selected, setSelected] = useState<NodeInfo | null>(null);

  useEffect(() => {
    getPublicInfo().then((p) => {
      setPub(p);
      if (p.sitename) document.title = p.sitename;
    }).catch(() => {});
    getNodes().then(setNodes).catch(() => {});
  }, []);

  // realtime poll, 2s cadence, skips when tab hidden
  useEffect(() => {
    let stop = false;
    let timer: number | undefined;
    const tick = async () => {
      if (stop) return;
      if (!document.hidden) {
        try {
          setLatest(await getLatest());
        } catch {
          /* transient network error: keep last data */
        }
      }
      timer = window.setTimeout(tick, 2000);
    };
    tick();
    const onVis = () => {
      if (!document.hidden) {
        window.clearTimeout(timer);
        tick();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const settings = (pub?.theme_settings ?? {}) as Record<string, unknown>;
  const cfgDay = (settings.wallpaperDay as string) || "";
  const cfgNight = (settings.wallpaperNight as string) || "";
  // fall back to the other mode's wallpaper, then to bundled defaults
  const wallDay = cfgDay || cfgNight || DEFAULT_WALL_DAY;
  const wallNight = cfgNight || cfgDay || DEFAULT_WALL_NIGHT;
  const showLatency = settings.showLatencyOnCard === true || settings.showLatencyOnCard === "true";
  setLossSensitivity((settings.lossSensitivity as string) || "Standard");
  const offlinePos = ((settings.offlinePosition as string) || "Last").toLowerCase();

  const groups = useMemo(() => {
    const gs = new Set<string>();
    for (const n of nodes) if (n.group) gs.add(n.group);
    return Array.from(gs);
  }, [nodes]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = nodes.filter((n) => !n.hidden);
    if (group) list = list.filter((n) => n.group === group);
    if (q) {
      list = list.filter((n) =>
        `${n.name} ${n.region} ${n.os} ${n.tags}`.toLowerCase().includes(q),
      );
    }
    const byWeight = (a: NodeInfo, b: NodeInfo) =>
      b.weight - a.weight || a.name.localeCompare(b.name);
    if (offlinePos === "keep") return list.sort(byWeight);
    const rank = (n: NodeInfo) => (latest[n.uuid]?.online ? 0 : 1);
    return list.sort((a, b) => {
      const d = rank(a) - rank(b);
      return offlinePos === "first" ? -d || byWeight(a, b) : d || byWeight(a, b);
    });
  }, [nodes, latest, query, group, offlinePos]);

  return (
    <>
      <Background mode={mode} wallpaperDay={wallDay} wallpaperNight={wallNight} />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-10">
        {/* header */}
        <header className="flex items-center gap-3 py-5">
          <h1 className="text-[22px] font-bold tracking-tight flex-1">
            {pub?.sitename || "Komari"}
            <span
              className="inline-block w-2 h-2 rounded-full ml-2 align-middle"
              style={{ background: "var(--accent)" }}
            />
          </h1>
          <button
            onClick={toggleMode}
            className="glass rounded-full w-10 h-10 grid place-items-center text-[17px] cursor-pointer card-hover"
            aria-label="toggle theme"
            title={mode === "day" ? "☀ → 🌙" : "🌙 → ☀"}
          >
            {/* key remount replays the pop-in on every toggle */}
            <span key={mode} className="mode-pop">
              {mode === "day" ? "☀️" : "🌙"}
            </span>
          </button>
        </header>

        <StatsBar nodes={nodes.filter((n) => !n.hidden)} latest={latest} />

        {/* search + groups */}
        <div className="flex items-center gap-2 mt-4 mb-4 flex-wrap">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search")}
            className="glass search rounded-full px-4 py-2 text-[13.5px] w-full sm:w-[300px]"
          />
          {groups.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setGroup("")}
                className="px-3 py-1.5 rounded-full text-[12.5px] cursor-pointer"
                style={
                  group === ""
                    ? { background: "var(--accent)", color: "#fff" }
                    : { background: "var(--chip)", border: "1px solid var(--glass-border)" }
                }
              >
                {t("all")}
              </button>
              {groups.map((g) => (
                <button
                  key={g}
                  onClick={() => setGroup(g === group ? "" : g)}
                  className="px-3 py-1.5 rounded-full text-[12.5px] cursor-pointer"
                  style={
                    group === g
                      ? { background: "var(--accent)", color: "#fff" }
                      : { background: "var(--chip)", border: "1px solid var(--glass-border)" }
                  }
                >
                  {g}
                </button>
              ))}
            </div>
          )}
          <span className="text-[12px] text-dim ml-auto num">
            {shown.length} {t("nodes")}
          </span>
        </div>

        {/* card grid */}
        {shown.length === 0 && nodes.length > 0 && (
          <div className="text-center text-dim py-20 text-[14px]">{t("empty")}</div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {shown.map((n, i) => (
            <NodeCard
              key={n.uuid}
              node={n}
              status={latest[n.uuid]}
              index={i}
              showLatency={showLatency}
              onClick={() => setSelected(n)}
            />
          ))}
        </div>

        <footer className="text-center text-[12px] text-dim mt-10">
          Powered by{" "}
          <a href="https://github.com/komari-monitor/komari" className="underline opacity-80 hover:opacity-100">
            Komari
          </a>{" "}
          · Theme{" "}
          <a href="https://github.com/tryingmeow/komari-theme-tasogare" className="underline opacity-80 hover:opacity-100">
            Tasogare 黄昏
          </a>{" "}
          (｡•̀ᴗ-)✧
        </footer>
      </div>

      {selected && (
        <Suspense fallback={null}>
          <DetailModal
            node={selected}
            status={latest[selected.uuid]}
            mode={mode}
            onClose={() => setSelected(null)}
          />
        </Suspense>
      )}
    </>
  );
}
