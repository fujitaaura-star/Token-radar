# Token Radar — make.fun token-radar-01

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/fujitaaura-star/Token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/fujitaaura-star/Token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar: it reads a sealed DefiLlama snapshot, works out which
protocols still record no token (and are not a wrapped, staked or bridged
product of one that trades), ranks them by what their launch would be worth,
and hands in a static dashboard with a farm plan for every row.

## Model (radar-3, fitted regression — no flat multiple, no hardcoded names)

`implied = round(exp(a_cat + b x ln(tvl_usd) + c x ln(1 + age_days)))`

Every term is fitted by least squares on the 119 live protocols that trade
(market cap, TVL, category other than CEX):

- **a_cat** — one intercept per category with at least 3 live protocols;
  smaller categories use the market intercept (9.748 on this snapshot).
- **b = 0.422** — market cap grows like the square root of TVL, not in
  proportion to it.
- **c = -0.135** — older live protocols carry less market cap per TVL.
  Age is time since first listing; unknown age counts as 365 days.

## Held-out tests (shown on the board, not just here)

- **Walk-forward ×2.59** (n=44, 43% within ×2): fit on the 43 protocols
  listed before 2024-02-28, predict the 44 listed after it.
- **Leave-one-out ×4.01** (n=119, 27% within ×2): fit on the other 118,
  predict each live protocol in turn.
- The starter's flat 0.25× multiple scores ×4.14 walk-forward and ×4.96
  leave-one-out on the same splits. The number is the median factor the
  prediction is off by — lower is better.

Eligibility is the watchlist rule applied to every row: pre-token, not
Bridge / Canonical Bridge / Liquid Staking / Liquid Restaking / Restaked
BTC / CEX, no version-marker name, no whole word wrapped / staked /
staking, no exchange-prefixed name. On this snapshot that leaves **198**
rankable protocols: the 40 watchlist slugs plus 158 early ones. Live-token
protocols are set aside (top 24 by market cap) — their market cap is a
fact, not a model, and it is also what the model is fitted on.

All **758** protocols are accounted for on the board: 198 ranked, 416
live-token, 144 pre-token excluded by rule (CEX 42, Liquid Staking 38,
Bridge 28, Canonical Bridge 15, versioned name 11, wrapped/staked word 5,
Liquid Restaking 3, Restaked BTC 2).

Each row carries a 7-step farm plan derived from its own category, chains,
TVL and age, with a cost and a time for every step — plus a costed verdict:
FARM for tiers S and A (implied ≥ $25M), THIN for B (≥ $10M), SKIP for C.
Every plan states its minimum capital ($50–250), its setup and weekly gas,
and its gas cost per hour of work. Token rate is the share of protocols in
a category that already have a token: the peers' record, not a forecast.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json|directory>
```

Node 22.18+ (type stripping runs `main.ts` as-is), standard library only,
no network. The program writes `out/board.json`, `out/data.js`,
`out/dashboard/`, `out/screenshots/` and `out/dossier.json`, and is
deterministic: two runs write the same bytes. No clock, no randomness, no
timestamp in any output.

## Layout

- `main.ts` — entrypoint: reads the snapshot, writes the outputs.
- `lib/model.ts` — the model, the held-out tests, the farm plans, the board
  validation.
- `vendor/makefun-board.ts` — make.fun's dossier library, byte for byte
  from the kit (do not edit).
- `dashboard/` — the static page (index.html, app.css, app.js). It renders
  with no network from `data.js` beside it.
- `screenshots/` — the board, a protocol detail view, a filtered view.

## Honesty notes

- "Records no token" is not proof a token does not exist; the snapshot is
  DefiLlama's record, not a guarantee.
- Implied value is this entry's own claim, never make.fun's, and never a
  prediction that a token will launch, or when.
- 20 of the early rows sit above the $50M floor but off the house
  watchlist; the snapshot alone cannot say why, and the dashboard flags
  them as candidates, not confirmed launches.
- The held-out numbers are weak in absolute terms (leave-one-out ×4.01):
  market cap per TVL varies by orders of magnitude even inside one
  category. The board shows them anyway, next to the flat multiple they
  beat, rather than hiding the model's error.

---

Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards
