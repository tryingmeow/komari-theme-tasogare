// latency tiers: green = fast, amber = medium, rose = slow; heavy packet loss degrades the tier
export const TIER_COLORS = ["#34d399", "#fbbf24", "#fb7185"];
// happy → neutral → glum, matching the tier; the same face family, eyes/brows drooping as it worsens
export const TIER_FACES = ["(≧ω≦)", "(･ω･)", "(´･ω･`)"];

// loss thresholds [amber, rose] as %, selected by the lossSensitivity theme setting;
// Standard's 5% floor tolerates one stray lost probe per strip bucket (~24 samples → 4.17%)
const LOSS_PRESETS: Record<string, [number, number]> = {
  Strict: [3, 9],
  Standard: [5, 12],
  Relaxed: [10, 25],
};
let lossTiers = LOSS_PRESETS.Standard;
export const setLossSensitivity = (preset: string) => {
  lossTiers = LOSS_PRESETS[preset] ?? LOSS_PRESETS.Standard;
};

export const pingTier = (ms: number, loss = 0) => {
  const byMs = ms < 100 ? 0 : ms < 200 ? 1 : 2;
  const byLoss = loss >= lossTiers[1] ? 2 : loss >= lossTiers[0] ? 1 : 0;
  return Math.max(byMs, byLoss);
};

export const pingColor = (ms: number, loss = 0) => TIER_COLORS[pingTier(ms, loss)];
export const pingFace = (ms: number, loss = 0) => TIER_FACES[pingTier(ms, loss)];
export const lossColor = (loss: number) =>
  loss >= lossTiers[1] ? "#fb7185" : loss >= lossTiers[0] ? "#fbbf24" : undefined;
