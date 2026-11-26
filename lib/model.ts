// Token Radar, model radar-3: a fitted log-log regression, not a flat multiple.
//
// The question the board answers is "which pre-token protocol is worth farming
// next, and what would its launch be worth if its record stayed as it is".
// The answer is built only from the sealed snapshot's own figures. Every
// value term is fitted from the live protocols that already trade, and every
// fitted term is tested held-out twice before the board is written:
//
//   ln(mcap) = a_category + b * ln(tvl) + c * ln(1 + age_days)
//
//   1. The fit. Ordinary least squares on the 119 live protocols with a
//      market cap, a TVL and a category other than CEX. Each category with
//      at least 3 live protocols gets its own intercept; smaller categories
//      use the market intercept. The slope b and the age coefficient c are
//      shared. On this snapshot b = 0.422 (market cap grows like the square
//      root of TVL, not in proportion to it) and c = -0.135 (older live
//      protocols carry less market cap per TVL). No protocol name is ever
//      special-cased, and no coefficient is hand-set.
//   2. The prediction. A pre-token protocol's implied value is the fitted
//      value for its own TVL, age and category: exp(a + b ln tvl +
//      c ln(1 + age)). Unknown age counts as 365 days, the same convention
//      the fit uses for live protocols with no listed date.
//   3. The tests. Walk-forward: fit on the 43 protocols listed before
//      2024-02-28, predict the 44 listed after it. Leave-one-out: fit on
//      the other 118, predict each of the 119 in turn. Both are reported
//      on the board as the median factor the prediction is off by, and the
//      share of predictions within x2. The starter's flat 0.25x multiple
//      is scored the same way, on the same splits, so the board shows the
//      improvement instead of claiming it.
//
// Eligibility is the watchlist rule applied to every row, not just the
// watchlist: pre-token (no mcap, no gecko id, no symbol) AND not a wrapped,
// staked or bridged product of a token that already trades. That means out:
// category Bridge, Canonical Bridge, Liquid Staking, Liquid Restaking,
// Restaked BTC or CEX; a name ending in a version marker (V2, 2.0 ...); a
// name carrying a whole word wrapped / staked / staking; a name starting
// with an exchange's name. On this snapshot that leaves 198 rankable
// protocols: the 40 watchlist slugs plus 158 early ones below (and, for
// 20 of them, above) the $50M floor. The board ranks all 198 — nothing
// hand-picked, nothing smuggled in — and the other 560 protocols are filed
// in lanes on the board too, so all 758 are accounted for.
//
// Live-token protocols are never ranked: their market cap is a fact, not a
// model, so the dashboard shows the top 24 by market cap set aside, as the
// market's own answer to the same question.

/** One protocol entry: exactly the ten fields the sealed snapshot carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants: only the fit's own rules, no hand-set multipliers. */
export interface ModelConstants {
  min_category_n: number;
  unknown_age_days: number;
}

export const MODEL: ModelConstants = {
  min_category_n: 3,
  unknown_age_days: 365,
};

/** The model's version label: the dashboard names it. */
export const MODEL_VERSION = 'radar-3';

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** One category in the fitted model: its intercept and how many live protocols fit it. */
export interface FitCategory {
  category: string;
  n: number;
  intercept: number;
  fallback: boolean;
}

/** The fitted regression: shared slope and age coefficient, one intercept per category. */
export interface RegressionFit {
  intercept: number;
  slope: number;
  age_coef: number;
  global_intercept: number;
  fit_n: number;
  categories: FitCategory[];
}

/** One category's comparables, as the dashboard's comparables table shows them. */
export interface Comparable {
  category: string;
  n: number;
  pre_n: number;
  median: number | null;
  fitted_multiple: number;
  token_rate: number | null;
  fallback: boolean;
}

/** One held-out test of the fitted model, with the flat 0.25x multiple scored the same way. */
export interface Validation {
  kind: 'walk-forward' | 'leave-one-out';
  n: number;
  cut_date: string | null;
  median_factor: number;
  within_2x_pct: number;
  flat_median_factor: number;
  flat_within_2x_pct: number;
}

/** Both held-out tests, as the dashboard's validation panel shows them. */
export interface ValidationSet {
  walk_forward: Validation;
  leave_one_out: Validation;
}

/** One reason a pre-token protocol is not ranked, with its count. */
export interface ExclusionReason {
  reason: string;
  n: number;
}

/** Every protocol in the snapshot, filed in a lane: nothing is left out. */
export interface Accounting {
  total: number;
  ranked: number;
  live: number;
  excluded: number;
  reasons: ExclusionReason[];
}

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** The farm verdict: what the costed plan says to do with this row. */
export type Verdict = 'FARM' | 'THIN' | 'SKIP';

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  on_watchlist: boolean;
  age_days: number | null;
  tier: string;
  confidence: string;
  verdict: Verdict;
  implied_value_usd: number;
  model: {
    fit_intercept: number;
    fit_slope: number;
    fit_age_coef: number;
    fit_category_n: number;
    fit_fallback: boolean;
    age_days: number | null;
  };
  farm_capital_usd: number;
  farm_hold_days: number;
  farm_setup_gas_usd: number;
  farm_usd_per_hour: number;
  farm_steps: string[];
}

/** The dashboard's compact view of one row, with farm plans generated in the page. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  listed_at: string | null;
  age_days: number | null;
  on_watchlist: boolean;
  tier: string;
  confidence: string;
  verdict: Verdict;
  implied_value_usd: number;
  fit_intercept: number;
  fit_slope: number;
  fit_age_coef: number;
  fit_category_n: number;
  fit_fallback: boolean;
  fitted_multiple: number;
  token_rate: number | null;
  farm_capital_usd: number;
  farm_hold_days: number;
  farm_setup_gas_usd: number;
  farm_usd_per_hour: number;
}

/** A live-token protocol: it already trades, so the board shows the market's own value. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** Everything the dashboard needs: the board, the live set, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  above_floor_not_watchlist: number;
  live_size: number;
  live_count: number;
  total_implied_usd: number;
  fit: RegressionFit;
  validation: ValidationSet;
  accounting: Accounting;
  comparables: Comparable[];
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** The median of a sorted array, or null when it is empty. */
function median(sorted: number[]): number | null {
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;
/** The categories that are a wrapped, staked or bridged product of a token that trades. */
const EXCLUDED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);
/** A whole word wrapped / staked / staking anywhere in the name. */
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;
/** A name that begins with an exchange's name. */
const EXCHANGE_PREFIX = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/;

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/**
 * The one reason a pre-token protocol is not ranked, in priority order, or
 * null when it is rankable. One reason per protocol, so the exclusion counts
 * add up to every protocol the board does not rank.
 */
export function exclusionReason(p: SnapshotProtocol): string | null {
  if (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) return `${p.category} category`;
  if (VERSIONED.test(p.name)) return 'versioned name';
  if (WRAPPED_WORD.test(p.name)) return 'wrapped/staked word';
  if (EXCHANGE_PREFIX.test(p.name)) return 'exchange-prefixed name';
  return null;
}

/**
 * Whether a protocol is one the board may rank: pre-token, and not a wrapped,
 * staked or bridged product of a token that already trades. This is the
 * watchlist's own rule, applied to every candidate row.
 */
export function isRankable(p: SnapshotProtocol): boolean {
  return isPreToken(p) && exclusionReason(p) === null;
}

/** The live protocols the fit is built from: they trade, so their market cap is a fact. */
export function liveUniverse(snapshot: Snapshot): SnapshotProtocol[] {
  return snapshot.protocols.filter(
    (p) => !isPreToken(p) && p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0 && p.category !== 'CEX',
  );
}

/** Solve A x = b by Gaussian elimination with partial pivoting; A is small and well-conditioned. */
function solveLinear(a: number[][], b: number[]): number[] {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]!]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(m[r]![col]!) > Math.abs(m[piv]![col]!)) piv = r;
    const tmp = m[col]!;
    m[col] = m[piv]!;
    m[piv] = tmp;
    const d = m[col]![col]!;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = m[r]![col]! / d;
      for (let k = col; k <= n; k++) m[r]![k] = m[r]![k]! - f * m[col]![k]!;
    }
  }
  return m.map((row, i) => row[n]! / row[i]!);
}

/**
 * Fit ln(mcap) = a_category + b ln(tvl) + c ln(1 + age) by least squares on
 * the live protocols given. Categories with at least `min_category_n` live
 * protocols get their own intercept; the rest use the market intercept.
 * Pure arithmetic on the snapshot: the same input always fits the same line.
 */
export function fitRegression(train: SnapshotProtocol[], asOf: string, model: ModelConstants = MODEL): RegressionFit {
  const counts = new Map<string, number>();
  for (const p of train) {
    const key = p.category ?? 'Other';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let bigCats = [...counts.entries()].filter(([, n]) => n >= model.min_category_n).map(([k]) => k).sort();
  if (train.length < 3 + bigCats.length + 1) bigCats = [];
  const width = 3 + bigCats.length;
  const xtx: number[][] = Array.from({ length: width }, () => Array<number>(width).fill(0));
  const xty: number[] = Array<number>(width).fill(0);
  for (const p of train) {
    const age = ageDays(asOf, p.listed_at) ?? model.unknown_age_days;
    const row: number[] = [1, Math.log(Math.max(1, p.tvl_usd)), Math.log(1 + age)];
    for (const c of bigCats) row.push(p.category === c ? 1 : 0);
    const y = Math.log(p.mcap_usd!);
    for (let i = 0; i < width; i++) {
      xty[i] = xty[i]! + row[i]! * y;
      for (let j = 0; j < width; j++) xtx[i]![j] = xtx[i]![j]! + row[i]! * row[j]!;
    }
  }
  for (let i = 0; i < width; i++) xtx[i]![i] = xtx[i]![i]! + 1e-8;
  const beta = solveLinear(xtx, xty);
  const globalIntercept = beta[0]!;
  const categories: FitCategory[] = [...counts.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([category, n]) => {
      const at = bigCats.indexOf(category);
      return { category, n, intercept: at >= 0 ? beta[0]! + beta[3 + at]! : globalIntercept, fallback: at < 0 };
    });
  return { intercept: globalIntercept, slope: beta[1]!, age_coef: beta[2]!, global_intercept: globalIntercept, fit_n: train.length, categories };
}

/** The intercept one protocol's category gets under a fit, or the market intercept. */
export function interceptFor(p: SnapshotProtocol, fit: RegressionFit): { intercept: number; n: number; fallback: boolean } {
  const found = fit.categories.find((c) => c.category === (p.category ?? 'Other'));
  if (found !== undefined) return { intercept: found.intercept, n: found.n, fallback: found.fallback };
  return { intercept: fit.global_intercept, n: 0, fallback: true };
}

/** The fitted implied value: exp(a + b ln tvl + c ln(1 + age)), at least $1, rounded to a dollar. */
export function predictImplied(p: SnapshotProtocol, asOf: string, fit: RegressionFit, model: ModelConstants = MODEL): number {
  const { intercept } = interceptFor(p, fit);
  const age = ageDays(asOf, p.listed_at) ?? model.unknown_age_days;
  return Math.max(1, Math.round(Math.exp(intercept + fit.slope * Math.log(Math.max(1, p.tvl_usd)) + fit.age_coef * Math.log(1 + age))));
}

/** The fitted multiple at the reference point the comparables table uses: the implied value per dollar of TVL at $100M TVL, 365 days old. */
export function fittedMultipleAtRef(fit: RegressionFit, intercept: number): number {
  return Math.exp(intercept + fit.slope * Math.log(100_000_000) + fit.age_coef * Math.log(366)) / 100_000_000;
}

/** The share of protocols in a category that already have a token: the peers' record, not a forecast. */
export function tokenRate(snapshot: Snapshot, category: string): number | null {
  let live = 0;
  let pre = 0;
  for (const p of snapshot.protocols) {
    if ((p.category ?? 'Other') !== category) continue;
    if (isPreToken(p)) pre++;
    else live++;
  }
  if (live + pre === 0) return null;
  return live / (live + pre);
}

/** The comparables table: one entry per category that has live protocols, plus the market fallback. */
export function comparables(snapshot: Snapshot, fit: RegressionFit): Comparable[] {
  const live = liveUniverse(snapshot);
  const byCat = new Map<string, number[]>();
  for (const p of live) {
    const key = p.category ?? 'Other';
    const list = byCat.get(key) ?? [];
    list.push(p.mcap_usd! / p.tvl_usd);
    byCat.set(key, list);
  }
  const out: Comparable[] = [];
  for (const [category, ratios] of [...byCat.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    ratios.sort((a, b) => a - b);
    const found = fit.categories.find((c) => c.category === category);
    const intercept = found !== undefined ? found.intercept : fit.global_intercept;
    const preN = snapshot.protocols.filter((p) => (p.category ?? 'Other') === category && isPreToken(p)).length;
    out.push({
      category,
      n: ratios.length,
      pre_n: preN,
      median: median(ratios),
      fitted_multiple: fittedMultipleAtRef(fit, intercept),
      token_rate: tokenRate(snapshot, category),
      fallback: found === undefined || found.fallback,
    });
  }
  return out;
}

/** One held-out score: the median factor the prediction is off by, and the share within x2. */
function scoreHeldOut(test: SnapshotProtocol[], predict: (p: SnapshotProtocol) => number): { median_factor: number; within_2x_pct: number } {
  const factors = test.map((p) => Math.abs(Math.log(predict(p) / p.mcap_usd!))).sort((a, b) => a - b);
  const medianFactor = Math.exp(median(factors) ?? 0);
  const within = test.filter((p) => {
    const r = predict(p) / p.mcap_usd!;
    return r >= 0.5 && r <= 2;
  }).length;
  return { median_factor: Math.round(medianFactor * 100) / 100, within_2x_pct: Math.round((100 * within) / test.length) };
}

/** Both held-out tests, each scored for the fitted model and for the flat 0.25x starter multiple. */
export function validateModel(snapshot: Snapshot, model: ModelConstants = MODEL): ValidationSet {
  const live = liveUniverse(snapshot);
  const flat = (p: SnapshotProtocol): number => Math.max(1, Math.round(p.tvl_usd * 0.25));
  // Walk-forward: fit on the older half by listing date, predict the newer half.
  const dated = live.filter((p) => p.listed_at !== null).sort((a, b) => (a.listed_at! < b.listed_at! ? -1 : 1));
  const cut = dated[Math.floor(dated.length / 2)]!.listed_at!;
  const train = dated.filter((p) => p.listed_at! < cut);
  const test = dated.filter((p) => p.listed_at! >= cut);
  const wfFit = fitRegression(train, snapshot.as_of, model);
  const wf = scoreHeldOut(test, (p) => predictImplied(p, snapshot.as_of, wfFit, model));
  const wfFlat = scoreHeldOut(test, flat);
  const walkForward: Validation = {
    kind: 'walk-forward',
    n: test.length,
    cut_date: cut,
    median_factor: wf.median_factor,
    within_2x_pct: wf.within_2x_pct,
    flat_median_factor: wfFlat.median_factor,
    flat_within_2x_pct: wfFlat.within_2x_pct,
  };
  // Leave-one-out: fit on the other 118, predict each of the 119 in turn.
  const looPreds = new Map<string, number>();
  for (const p of live) {
    const rest = live.filter((q) => q !== p);
    const f = fitRegression(rest, snapshot.as_of, model);
    looPreds.set(p.slug, predictImplied(p, snapshot.as_of, f, model));
  }
  const loo = scoreHeldOut(live, (p) => looPreds.get(p.slug)!);
  const looFlat = scoreHeldOut(live, flat);
  const leaveOneOut: Validation = {
    kind: 'leave-one-out',
    n: live.length,
    cut_date: null,
    median_factor: loo.median_factor,
    within_2x_pct: loo.within_2x_pct,
    flat_median_factor: looFlat.median_factor,
    flat_within_2x_pct: looFlat.within_2x_pct,
  };
  return { walk_forward: walkForward, leave_one_out: leaveOneOut };
}

/** Every protocol filed in a lane, so the board accounts for all 758. */
export function accountingOf(snapshot: Snapshot): Accounting {
  const ranked = snapshot.protocols.filter(isRankable).length;
  const live = snapshot.protocols.filter((p) => !isPreToken(p)).length;
  const counts = new Map<string, number>();
  for (const p of snapshot.protocols) {
    if (!isPreToken(p) || isRankable(p)) continue;
    const reason = exclusionReason(p)!;
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  const reasons = [...counts.entries()]
    .map(([reason, n]) => ({ reason, n }))
    .sort((a, b) => b.n - a.n || (a.reason < b.reason ? -1 : 1));
  const excluded = reasons.reduce((sum, r) => sum + r.n, 0);
  return { total: snapshot.protocols.length, ranked, live, excluded, reasons };
}

/** The value tier from the implied value: S is the top of the board. */
export function tierFor(implied: number): string {
  if (implied >= 50_000_000) return 'S';
  if (implied >= 25_000_000) return 'A';
  if (implied >= 10_000_000) return 'B';
  return 'C';
}

/** The farm verdict from the tier: only rows big enough to repay the farm are FARM. */
export function verdictFor(tier: string): Verdict {
  if (tier === 'S' || tier === 'A') return 'FARM';
  if (tier === 'B') return 'THIN';
  return 'SKIP';
}

/** How much to trust one row's number: what the snapshot actually recorded for it. */
export function confidenceFor(p: SnapshotProtocol, fallback: boolean): string {
  let gaps = 0;
  if (p.listed_at === null) gaps++;
  if (fallback) gaps++;
  if (gaps === 0) return 'high';
  if (gaps === 1) return 'medium';
  return 'low';
}

const round6 = (n: number): number => Math.round(n * 1e6) / 1e6;
const round2 = (n: number): number => Math.round(n * 100) / 100;

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const fit = fitRegression(liveUniverse(snapshot), snapshot.as_of, model);
  const comps = new Map(comparables(snapshot, fit).map((c) => [c.category, c]));
  const watchlist = new Set(snapshot.watchlist);
  const ranked = snapshot.protocols.filter(isRankable);
  const scored = ranked.map((p) => {
    const { intercept, n, fallback } = interceptFor(p, fit);
    const implied = predictImplied(p, snapshot.as_of, fit, model);
    const age = ageDays(snapshot.as_of, p.listed_at);
    return { p, intercept, n, fallback, implied, age };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => {
    const tier = tierFor(s.implied);
    const capital = capitalFor(s.p);
    const hold = holdDaysFor(s.age);
    const setupGas = capital >= 150 ? 8 : 4;
    const weeks = hold / 7;
    const totalGas = setupGas + 2 * weeks;
    const totalHours = 0.5 + weeks * (10 / 60);
    const comp = comps.get(s.p.category ?? 'Other');
    return {
      rank: i + 1,
      slug: s.p.slug,
      name: s.p.name,
      category: s.p.category,
      chains: s.p.chains,
      tvl_usd: s.p.tvl_usd,
      change_7d: s.p.change_7d,
      mcap_usd: s.p.mcap_usd,
      listed_at: s.p.listed_at,
      gecko_id: s.p.gecko_id,
      symbol: s.p.symbol,
      token_status: 'pre-token',
      on_watchlist: watchlist.has(s.p.slug),
      age_days: s.age,
      tier,
      confidence: confidenceFor(s.p, s.fallback),
      verdict: verdictFor(tier),
      implied_value_usd: s.implied,
      model: {
        fit_intercept: round6(s.intercept),
        fit_slope: round6(fit.slope),
        fit_age_coef: round6(fit.age_coef),
        fit_category_n: s.n,
        fit_fallback: s.fallback,
        age_days: s.age,
      },
      farm_capital_usd: capital,
      farm_hold_days: hold,
      farm_setup_gas_usd: setupGas,
      farm_usd_per_hour: round2(totalGas / totalHours),
      farm_steps: farmSteps(s.p, s.age).map(stepText),
    };
  });
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 1_000_000_000) return 250;
  if (p.tvl_usd >= 100_000_000) return 150;
  if (p.tvl_usd >= 25_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 45;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's core action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain}, then borrow a small amount against it and repay it once.`;
  if (c.includes('dex') || c.includes('liquidity manager')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} in a balanced pair and keep the position open.`;
  if (c.includes('risk curator') || c.includes('capital allocator') || c.includes('curator')) return `Deposit $${capital} of USDC into a ${name} curated vault on ${chain} and keep the vault shares.`;
  if (c.includes('yield') || c.includes('leveraged farm') || c.includes('farm')) return `Deposit $${capital} of USDC into ${name}'s main yield vault on ${chain} and keep the shares.`;
  if (c.includes('basis trading')) return `Deposit $${capital} of USDC into ${name}'s basis vault on ${chain} and hold the position through one funding cycle.`;
  if (c.includes('rwa')) return `Mint or buy $${capital} of ${name}'s yield-bearing asset on ${chain} and hold it in the farming wallet.`;
  if (c.includes('derivative') || c.includes('perpetual') || c.includes('options')) return `Deposit $${capital} of USDC as margin on ${name} on ${chain} and open one small hedged position.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${name} on ${chain} and keep the receipt token.`;
  if (c.includes('prediction')) return `Fund $${capital} of USDC on ${name} and place one small position on a market that settles after the snapshot window.`;
  if (c.includes('stable')) return `Mint or wrap $${capital} of the stable asset through ${name} on ${chain} and hold it in the farming wallet.`;
  if (c.includes('bridge')) return `Bridge $${capital} of USDC into ${chain} through ${name}, then use the bridged funds in one app on that chain.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy active for the full hold.`;
  if (c.includes('index')) return `Buy $${capital} of ${name}'s index token on ${chain} and hold it in the farming wallet.`;
  if (c.includes('payment')) return `Route $${capital} of real payment volume through ${name} on ${chain} across two separate weeks.`;
  if (c.includes('governance')) return `Deposit $${capital} into ${name} on ${chain} and vote once on a live proposal with the farming wallet.`;
  if (c.includes('otc')) return `Place one $${capital} order through ${name} on ${chain} and settle it in full.`;
  if (c.includes('chain')) return `Use $${capital} across ${name}'s own apps on ${chain}: one swap and one liquidity deposit, from the farming wallet.`;
  if (c.includes('btc')) return `Deposit $${capital} of BTC-backed collateral through ${name} on ${chain} and keep the position open.`;
  if (c.includes('card')) return `Load $${capital} onto ${name}'s card and spend it in two separate real purchases.`;
  if (c.includes('privacy')) return `Move $${capital} through ${name}'s private pool on ${chain} and keep the receipt for the farm log.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/** The category's weekly qualifying action, short enough to repeat every week. */
function weeklyFor(p: SnapshotProtocol): string {
  const c = (p.category ?? '').toLowerCase();
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return 'a small supply top-up, a borrow, or a repayment';
  if (c.includes('dex') || c.includes('liquidity manager')) return 'a small swap or a liquidity add and remove';
  if (c.includes('derivative') || c.includes('perpetual') || c.includes('options')) return 'one small trade, opened and closed';
  if (c.includes('prediction')) return 'one small position on a new market';
  if (c.includes('bridge')) return 'one small bridge in either direction';
  if (c.includes('governance')) return 'one vote or one forum comment from the farming wallet';
  if (c.includes('payment') || c.includes('card')) return 'one real payment or purchase';
  return 'a deposit, a swap, a vote, or a claim';
}

/**
 * A protocol's farm plan: seven steps, each an action with a cost and a time.
 * The plan is derived from the protocol's own record (category, chains, TVL
 * and age), never from a hand-written list of names.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const weekly = weeklyFor(p);
  const gas = capital >= 150 ? 8 : 4;
  return [
    {
      text: 'Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline on paper.',
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: `Move $${capital} of USDC to ${chain} from an exchange or a bridge you already trust, and check it arrived before continuing.`,
      cost: `about $${gas} of gas and the bridge fee`,
      time: '10 minutes',
    },
    {
      text: actionFor(p, capital, chain),
      cost: `$${capital} of capital and about $${gas} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: `Do one qualifying action each week, such as ${weekly}, so the wallet shows repeated use and not a single deposit.`,
      cost: 'about $2 of gas a week',
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot window.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Before you withdraw, open the protocol's own points or rewards page from its own site and claim only from the link it publishes.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `Write the wallet, the dates and every transaction hash in a farm log, and decide the unwind price before any token is announced.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** A board row's compact form for data.js, with the farm plan generated in the page. */
export function radarRow(row: BoardRow, fit: RegressionFit, comps: Map<string, Comparable>): RadarRow {
  const comp = comps.get(row.category ?? 'Other');
  // Full-precision coefficients here, so the page's recompute is the same
  // arithmetic as the board's; board.json keeps the rounded display values.
  const found = fit.categories.find((c) => c.category === (row.category ?? 'Other'));
  const intercept = found !== undefined ? found.intercept : fit.global_intercept;
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    listed_at: row.listed_at,
    age_days: row.age_days,
    on_watchlist: row.on_watchlist,
    tier: row.tier,
    confidence: row.confidence,
    verdict: row.verdict,
    implied_value_usd: row.implied_value_usd,
    fit_intercept: intercept,
    fit_slope: fit.slope,
    fit_age_coef: fit.age_coef,
    fit_category_n: row.model.fit_category_n,
    fit_fallback: row.model.fit_fallback,
    fitted_multiple: comp !== undefined ? comp.fitted_multiple : fittedMultipleAtRef(fit, row.model.fit_intercept),
    token_rate: comp !== undefined ? comp.token_rate : null,
    farm_capital_usd: row.farm_capital_usd,
    farm_hold_days: row.farm_hold_days,
    farm_setup_gas_usd: row.farm_setup_gas_usd,
    farm_usd_per_hour: row.farm_usd_per_hour,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const fit = fitRegression(liveUniverse(snapshot), snapshot.as_of, model);
  const comps = comparables(snapshot, fit);
  const compMap = new Map(comps.map((c) => [c.category, c]));
  const validation = validateModel(snapshot, model);
  const accounting = accountingOf(snapshot);
  const watchlist = new Set(snapshot.watchlist);
  const aboveFloor = board.filter((r) => !r.on_watchlist && r.tvl_usd >= snapshot.floor_usd).length;
  const early = board.filter((r) => !r.on_watchlist).length;
  const totalImplied = board.reduce((sum, r) => sum + r.implied_value_usd, 0);
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    above_floor_not_watchlist: aboveFloor,
    live_size: live.length,
    live_count: snapshot.protocols.filter((p) => !isPreToken(p)).length,
    total_implied_usd: totalImplied,
    fit,
    validation,
    accounting,
    comparables: comps,
    rows: board.map((r) => radarRow(r, fit, compMap)),
    live,
  };
  void watchlist;
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
