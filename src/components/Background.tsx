import { useEffect, useRef } from "react";

interface Props {
  mode: "day" | "night";
  wallpaperDay: string;
  wallpaperNight: string;
}

/** Fullscreen wallpaper with crossfade + subtle night star particles. */
export default function Background({ mode, wallpaperDay, wallpaperNight }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (mode !== "night") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let running = true;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const stars = Array.from({ length: 56 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.85,
      r: 0.4 + Math.random() * 1.1,
      p: Math.random() * Math.PI * 2,
      s: 0.4 + Math.random() * 0.9,
    }));

    // occasional shooting star: one streak every ~9-20s, upper half of the sky
    let meteor: { x: number; y: number; vx: number; vy: number; life: number } | null = null;
    let nextMeteorAt = 4000 + Math.random() * 6000;

    let last = 0;
    const draw = (ts: number) => {
      if (!running) return;
      // ~20fps is plenty for twinkling; keeps CPU cool on monitoring walls
      if (ts - last > 50) {
        last = ts;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const tsec = ts / 1000;
        for (const st of stars) {
          const a = 0.25 + 0.55 * Math.abs(Math.sin(st.p + tsec * st.s));
          ctx.globalAlpha = a;
          ctx.fillStyle = "#dfe7ff";
          ctx.beginPath();
          ctx.arc(st.x * canvas.width, st.y * canvas.height, st.r, 0, Math.PI * 2);
          ctx.fill();
        }

        if (!meteor && ts >= nextMeteorAt) {
          const dir = Math.random() < 0.5 ? -1 : 1;
          meteor = {
            x: (0.15 + Math.random() * 0.7) * canvas.width,
            y: (0.04 + Math.random() * 0.22) * canvas.height,
            vx: dir * (10 + Math.random() * 5),
            vy: 6 + Math.random() * 3,
            life: 1,
          };
        }
        if (meteor) {
          meteor.x += meteor.vx;
          meteor.y += meteor.vy;
          meteor.life -= 0.022;
          if (meteor.life <= 0) {
            meteor = null;
            nextMeteorAt = ts + 9000 + Math.random() * 11000;
          } else {
            const trail = 7; // trail length in velocity steps
            const g = ctx.createLinearGradient(
              meteor.x,
              meteor.y,
              meteor.x - meteor.vx * trail,
              meteor.y - meteor.vy * trail,
            );
            const a = 0.85 * Math.sin(Math.PI * meteor.life); // fade in then out
            g.addColorStop(0, `rgba(233,240,255,${a})`);
            g.addColorStop(1, "rgba(233,240,255,0)");
            ctx.strokeStyle = g;
            ctx.lineWidth = 1.6;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(meteor.x, meteor.y);
            ctx.lineTo(meteor.x - meteor.vx * trail, meteor.y - meteor.vy * trail);
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(draw);
    };
    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        raf = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [mode]);

  return (
    <>
      <div
        className="wall"
        style={{
          backgroundImage: `url("${wallpaperDay}")`,
          opacity: mode === "day" ? 1 : 0,
        }}
      />
      <div
        className="wall"
        style={{
          backgroundImage: `url("${wallpaperNight}")`,
          opacity: mode === "night" ? 1 : 0,
        }}
      />
      {mode === "night" && (
        <canvas
          ref={canvasRef}
          className="fixed inset-0 pointer-events-none"
          style={{ zIndex: 0 }}
        />
      )}
      <div className="wall-veil" />
    </>
  );
}
