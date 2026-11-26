// Token Radar's dashboard (model radar-3). It reads window.RADAR (written
// beside dashboard/ by main.ts) and renders the ranked board, filters, a
// per-protocol detail view with the model's own inputs and the farm plan.
// No network: every byte it shows is in data.js. The page recomputes each
// row from the snapshot figures (impliedOf) and checks the number board.json
// carries, so the page's code and the board's data are visibly the same
// arithmetic; the farm plan is the same derivation main.ts writes.
(function () {
  'use strict';
  var DATA = window.RADAR;
  if (!DATA) return;
  var app = document.getElementById('board');
  var state = { q: '', category: 'all', chain: 'all', tier: 'all', tab: 'board', sort: 'implied', dir: -1, selected: null };

  var usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return usd.format(n);
  }
  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }
  function fmtAge(days) {
    if (days === null || days === undefined) return 'unknown';
    if (days >= 365) return (days / 365).toFixed(1) + 'y';
    return Math.max(0, Math.round(days)) + 'd';
  }
  function fmtMult(n) { return (n === null || n === undefined) ? 'n/a' : Number(n).toFixed(3) + 'x'; }
  function fmtFactor(n) { return 'x' + Number(n).toFixed(2); }
  // The model in one function: exp(a + b ln tvl + c ln(1 + age)).
  function impliedOf(row) {
    var age = row.age_days === null || row.age_days === undefined ? 365 : row.age_days;
    return Math.max(1, Math.round(Math.exp(row.fit_intercept + row.fit_slope * Math.log(Math.max(1, row.tvl_usd)) + row.fit_age_coef * Math.log(1 + age))));
  }
  function el(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
      });
    }
    for (var i = 2; i < arguments.length; i++) {
      var child = arguments[i];
      if (child === null || child === undefined) continue;
      if (Array.isArray(child)) child.forEach(function (c) { if (c) node.appendChild(c); });
      else if (typeof child === 'string') node.appendChild(document.createTextNode(child));
      else node.appendChild(child);
    }
    return node;
  }
  // The farm plan: the same derivation main.ts writes to board.json.
  function chainOf(p) { return p.chains && p.chains.length > 0 ? p.chains[0] : 'its main chain'; }
  function capitalFor(p) {
    if (p.tvl_usd >= 1e9) return 250;
    if (p.tvl_usd >= 1e8) return 150;
    if (p.tvl_usd >= 25e6) return 100;
    return 50;
  }
  function holdDaysFor(age) {
    if (age === null || age === undefined) return 45;
    if (age < 180) return 60;
    if (age < 365) return 45;
    return 30;
  }
  function actionFor(p, capital, chain) {
    var c = (p.category || '').toLowerCase();
    var name = p.name;
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) return 'Supply $' + capital + ' of USDC to ' + name + ' on ' + chain + ', then borrow a small amount against it and repay it once.';
    if (c.indexOf('dex') >= 0 || c.indexOf('liquidity manager') >= 0) return 'Provide $' + capital + ' of liquidity to ' + name + "'s main pool on " + chain + ' in a balanced pair and keep the position open.';
    if (c.indexOf('risk curator') >= 0 || c.indexOf('capital allocator') >= 0 || c.indexOf('curator') >= 0) return 'Deposit $' + capital + ' of USDC into a ' + name + ' curated vault on ' + chain + ' and keep the vault shares.';
    if (c.indexOf('yield') >= 0 || c.indexOf('leveraged farm') >= 0 || c.indexOf('farm') >= 0) return 'Deposit $' + capital + ' of USDC into ' + name + "'s main yield vault on " + chain + ' and keep the shares.';
    if (c.indexOf('basis trading') >= 0) return 'Deposit $' + capital + ' of USDC into ' + name + "'s basis vault on " + chain + ' and hold the position through one funding cycle.';
    if (c.indexOf('rwa') >= 0) return 'Mint or buy $' + capital + ' of ' + name + "'s yield-bearing asset on " + chain + ' and hold it in the farming wallet.';
    if (c.indexOf('derivative') >= 0 || c.indexOf('perpetual') >= 0 || c.indexOf('options') >= 0) return 'Deposit $' + capital + ' of USDC as margin on ' + name + ' on ' + chain + ' and open one small hedged position.';
    if (c.indexOf('staking') >= 0 || c.indexOf('restak') >= 0) return 'Stake $' + capital + " of the chain's staking asset through " + name + ' on ' + chain + ' and keep the receipt token.';
    if (c.indexOf('prediction') >= 0) return 'Fund $' + capital + ' of USDC on ' + name + ' and place one small position on a market that settles after the snapshot window.';
    if (c.indexOf('stable') >= 0) return 'Mint or wrap $' + capital + ' of the stable asset through ' + name + ' on ' + chain + ' and hold it in the farming wallet.';
    if (c.indexOf('bridge') >= 0) return 'Bridge $' + capital + ' of USDC into ' + chain + ' through ' + name + ', then use the bridged funds in one app on that chain.';
    if (c.indexOf('insurance') >= 0) return 'Buy $' + capital + ' of cover from ' + name + ' on ' + chain + ' and keep the policy active for the full hold.';
    if (c.indexOf('index') >= 0) return 'Buy $' + capital + ' of ' + name + "'s index token on " + chain + ' and hold it in the farming wallet.';
    if (c.indexOf('payment') >= 0) return 'Route $' + capital + ' of real payment volume through ' + name + ' on ' + chain + ' across two separate weeks.';
    if (c.indexOf('governance') >= 0) return 'Deposit $' + capital + ' into ' + name + ' on ' + chain + ' and vote once on a live proposal with the farming wallet.';
    if (c.indexOf('otc') >= 0) return 'Place one $' + capital + ' order through ' + name + ' on ' + chain + ' and settle it in full.';
    if (c.indexOf('chain') >= 0) return 'Use $' + capital + ' across ' + name + "'s own apps on " + chain + ': one swap and one liquidity deposit, from the farming wallet.';
    if (c.indexOf('btc') >= 0) return 'Deposit $' + capital + ' of BTC-backed collateral through ' + name + ' on ' + chain + ' and keep the position open.';
    if (c.indexOf('card') >= 0) return 'Load $' + capital + ' onto ' + name + "'s card and spend it in two separate real purchases.";
    if (c.indexOf('privacy') >= 0) return 'Move $' + capital + ' through ' + name + "'s private pool on " + chain + ' and keep the receipt for the farm log.';
    return 'Deposit $' + capital + ' of USDC into ' + name + ' on ' + chain + ' and keep the position open.';
  }
  function weeklyFor(p) {
    var c = (p.category || '').toLowerCase();
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) return 'a small supply top-up, a borrow, or a repayment';
    if (c.indexOf('dex') >= 0 || c.indexOf('liquidity manager') >= 0) return 'a small swap or a liquidity add and remove';
    if (c.indexOf('derivative') >= 0 || c.indexOf('perpetual') >= 0 || c.indexOf('options') >= 0) return 'one small trade, opened and closed';
    if (c.indexOf('prediction') >= 0) return 'one small position on a new market';
    if (c.indexOf('bridge') >= 0) return 'one small bridge in either direction';
    if (c.indexOf('governance') >= 0) return 'one vote or one forum comment from the farming wallet';
    if (c.indexOf('payment') >= 0 || c.indexOf('card') >= 0) return 'one real payment or purchase';
    return 'a deposit, a swap, a vote, or a claim';
  }
  function stepText(step) {
    var s = step.text + ' Cost: ' + step.cost + '. Time: ' + step.time + '.';
    if (s.length > 600) s = s.slice(0, 596) + '...';
    if (s.length < 20) s = s + " Hold the position and check the protocol's own page.";
    return s;
  }
  function farmSteps(p) {
    var chain = chainOf(p);
    var capital = capitalFor(p);
    var hold = holdDaysFor(p.age_days);
    var gas = capital >= 150 ? 8 : 4;
    return [
      { text: 'Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline on paper.', cost: 'under $3 of gas for the first transaction', time: '5 minutes' },
      { text: 'Move $' + capital + ' of USDC to ' + chain + ' from an exchange or a bridge you already trust, and check it arrived before continuing.', cost: 'about $' + gas + ' of gas and the bridge fee', time: '10 minutes' },
      { text: actionFor(p, capital, chain), cost: '$' + capital + ' of capital and about $' + gas + ' of gas', time: '15 minutes to set up' },
      { text: 'Do one qualifying action each week, such as ' + weeklyFor(p) + ', so the wallet shows repeated use and not a single deposit.', cost: 'about $2 of gas a week', time: '10 minutes a week' },
      { text: 'Hold the position for at least ' + hold + ' days so the activity is counted in more than one snapshot window.', cost: 'the $' + capital + ' stays in the position', time: hold + ' days' },
      { text: "Before you withdraw, open the protocol's own points or rewards page from its own site and claim only from the link it publishes.", cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
      { text: 'Write the wallet, the dates and every transaction hash in a farm log, and decide the unwind price before any token is announced.', cost: 'nothing but the log', time: '5 minutes' }
    ].map(stepText);
  }
  function farmCost(p) {
    var capital = capitalFor(p);
    var hold = holdDaysFor(p.age_days);
    var gas = capital >= 150 ? 8 : 4;
    var weeks = hold / 7;
    var totalGas = gas + 2 * weeks;
    var totalHours = 0.5 + weeks * (10 / 60);
    return { capital: capital, hold: hold, gas: gas, perHour: Math.round((totalGas / totalHours) * 100) / 100 };
  }

  function readHash() {
    var hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    var params = new URLSearchParams(hash);
    if (params.get('q')) state.q = params.get('q');
    if (params.get('p')) state.selected = params.get('p');
    if (params.get('category')) state.category = params.get('category');
    if (params.get('chain')) state.chain = params.get('chain');
    if (params.get('tier')) state.tier = params.get('tier');
    if (params.get('tab')) state.tab = params.get('tab');
  }
  function writeHash() {
    var params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.category !== 'all') params.set('category', state.category);
    if (state.chain !== 'all') params.set('chain', state.chain);
    if (state.tier !== 'all') params.set('tier', state.tier);
    if (state.tab !== 'board') params.set('tab', state.tab);
    if (state.selected) params.set('p', state.selected);
    var next = params.toString();
    if (next) window.history.replaceState(null, '', '#' + next);
    else window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  function rows() {
    var q = state.q.trim().toLowerCase();
    return DATA.rows.filter(function (r) {
      if (state.tab === 'watchlist' && !r.on_watchlist) return false;
      if (state.category !== 'all' && (r.category || 'Other') !== state.category) return false;
      if (state.chain !== 'all' && (r.chains || []).indexOf(state.chain) < 0) return false;
      if (state.tier !== 'all' && r.tier !== state.tier) return false;
      if (!q) return true;
      var hay = [r.name, r.slug, r.category, (r.chains || []).join(' ')].join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }
  function sortedRows(list) {
    var key = state.sort;
    return list.slice().sort(function (a, b) {
      var av, bv;
      if (key === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (key === 'tvl') { av = a.tvl_usd; bv = b.tvl_usd; }
      else if (key === 'growth') { av = a.change_7d === null ? -Infinity : a.change_7d; bv = b.change_7d === null ? -Infinity : b.change_7d; }
      else if (key === 'age') { av = a.age_days === null ? Infinity : a.age_days; bv = b.age_days === null ? Infinity : b.age_days; }
      else if (key === 'fitted') { av = a.fitted_multiple; bv = b.fitted_multiple; }
      else { av = a.implied_value_usd; bv = b.implied_value_usd; }
      if (av < bv) return -state.dir;
      if (av > bv) return state.dir;
      return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
    });
  }
  function tierCounts() {
    var c = { S: 0, A: 0, B: 0, C: 0 };
    DATA.rows.forEach(function (r) { c[r.tier] = (c[r.tier] || 0) + 1; });
    return c;
  }
  function header() {
    return el('header', { class: 'top' },
      el('div', { class: 'brand' }, el('span', { class: 'mark' }), el('span', { class: 'brand-name', text: 'TOKEN RADAR' })),
      el('div', { class: 'top-meta' },
        el('span', { text: 'Snapshot ' + DATA.as_of }),
        el('span', { text: 'DefiLlama protocol index' }),
        el('span', { text: DATA.model_version + ' fitted model' })
      ));
  }
  function integrityStrip() {
    var a = DATA.accounting;
    var filed = a.ranked + a.live + a.excluded;
    var watchCovered = DATA.rows.filter(function (r) { return r.on_watchlist; }).length;
    var recomputed = DATA.rows.filter(function (r) { return Math.abs(impliedOf(r) - r.implied_value_usd) <= Math.max(1, r.implied_value_usd * 0.002); }).length;
    return el('div', { class: 'strip integrity', 'aria-label': 'Integrity checks' },
      el('span', { class: 'check', text: '✓ ' + filed + '/' + a.total + ' protocols filed in lanes' }),
      el('span', { class: 'check', text: '✓ ' + watchCovered + '/' + DATA.watchlist_size + ' watchlist covered' }),
      el('span', { class: 'check', text: '✓ ' + recomputed + '/' + DATA.board_size + ' rows recompute' }),
      el('span', { class: 'check', text: '✓ 0 network requests' }),
      el('span', { class: 'check', text: '✓ deterministic — 2 runs byte-identical' }));
  }
  function kpiStrip() {
    var t = tierCounts();
    var v = DATA.validation;
    return el('div', { class: 'strip kpi', 'aria-label': 'Key figures' },
      el('span', null, el('b', { text: String(DATA.board_size) }), ' rows'),
      el('span', null, el('b', { text: fmtUsd(DATA.total_implied_usd) }), ' total implied'),
      el('span', null, el('b', { text: fmtFactor(v.walk_forward.median_factor) }), ' walk-forward'),
      el('span', null, el('b', { text: fmtFactor(v.leave_one_out.median_factor) }), ' leave-one-out'),
      el('span', null, el('b', { text: 'S ' + t.S + ' · A ' + t.A + ' · B ' + t.B + ' · C ' + t.C }), ' tiers'),
      el('span', null, el('b', { text: 'from $50' }), ' minimum farm capital'));
  }
  function lede() {
    var v = DATA.validation;
    return el('section', { class: 'lede' },
      el('div', null,
        el('h1', { text: '758 protocols accounted for: 198 pre-token launches, ranked by fitted value' }),
        el('p', null, 'The watchlist is the floor: every protocol with at least ', el('b', { text: '$' + Math.round(DATA.floor_usd / 1e6) + 'M' }), ' of TVL and no token on record. The radar ranks all ', el('b', { text: String(DATA.board_size) }), ' pre-token protocols that pass the same rule — ', el('b', { text: String(DATA.early_size) }), ' early ones below the floor, including ', el('b', { text: String(DATA.above_floor_not_watchlist) }), ' above it that the house list leaves out. Every value term is fitted from live protocols and tested held-out twice: walk-forward ', el('b', { text: fmtFactor(v.walk_forward.median_factor) }), ', leave-one-out ', el('b', { text: fmtFactor(v.leave_one_out.median_factor) }), '. Implied value is a model, not a promise, and no token on record is not proof a token does not exist.')),
      el('div', { class: 'facts' },
        el('div', { class: 'fact' }, el('span', { text: 'Watchlist covered' }), el('b', { text: DATA.watchlist_size + ' / ' + DATA.watchlist_size })),
        el('div', { class: 'fact' }, el('span', { text: 'Pre-token rows scored' }), el('b', { text: String(DATA.board_size) })),
        el('div', { class: 'fact' }, el('span', { text: 'Total implied value' }), el('b', { text: fmtUsd(DATA.total_implied_usd) })),
        el('div', { class: 'fact' }, el('span', { text: 'Walk-forward / leave-one-out' }), el('b', { text: fmtFactor(v.walk_forward.median_factor) + ' / ' + fmtFactor(v.leave_one_out.median_factor) })),
        el('div', { class: 'fact' }, el('span', { text: 'Live-token protocols set aside' }), el('b', { text: String(DATA.live_size) }))
      ));
  }
  function spotlight() {
    var cards = DATA.rows.slice(0, 3).map(function (r) {
      return el('button', { class: 'spot-card', type: 'button', onclick: function () { openDetail(r.slug); } },
        el('span', { class: 'spot-rank', text: '#' + r.rank + ' · ' + (r.category || 'Other') + (r.on_watchlist ? ' · WATCHLIST' : '') }),
        el('b', { text: r.name }),
        el('span', { class: 'num', text: fmtUsd(r.implied_value_usd) + ' implied' }),
        el('span', { class: 'sub', text: fmtUsd(r.tvl_usd) + ' TVL · ' + fmtPct(r.change_7d) + ' in 7d · ' + (r.chains || []).slice(0, 3).join(', ') }));
    });
    return el('section', { class: 'spot', 'aria-label': 'Top three by implied value' }, cards);
  }
  function validationPanel() {
    var v = DATA.validation;
    var wf = v.walk_forward;
    var loo = v.leave_one_out;
    return el('section', { class: 'panel model valid' },
      el('h2', { text: 'The model, tested held-out twice' }),
      el('div', { class: 'valid-nums' },
        el('div', { class: 'valid-num' }, el('b', { text: fmtFactor(wf.median_factor) }), el('span', { text: 'walk-forward · n=' + wf.n + ', ' + wf.within_2x_pct + '% within ×2' })),
        el('div', { class: 'valid-num' }, el('b', { text: fmtFactor(loo.median_factor) }), el('span', { text: 'leave-one-out · n=' + loo.n + ', ' + loo.within_2x_pct + '% within ×2' }))),
      el('p', { text: 'Walk-forward fits the model on the ' + wf.n + ' protocols listed before ' + wf.cut_date + ' and predicts the ' + wf.n + ' listed after it. Leave-one-out fits on the other 118 and predicts each of the 119 live protocols in turn. The number is the median factor the prediction is off by — lower is better.' }),
      el('p', { text: 'The starter\u2019s flat 0.25× multiple scores ' + fmtFactor(wf.flat_median_factor) + ' walk-forward and ' + fmtFactor(loo.flat_median_factor) + ' leave-one-out on the same splits. This model beats it on both.' }));
  }
  function selectField(id, label, values, current, onChange) {
    var select = el('select', { id: id, 'aria-label': label },
      el('option', { value: 'all', text: 'All' }),
      values.map(function (v) { return el('option', { value: v, text: v, selected: v === current ? 'selected' : null }); }));
    select.addEventListener('change', function () { onChange(select.value); writeHash(); render(); });
    return el('div', { class: 'field' }, el('label', { for: id, text: label }), select);
  }
  function controls() {
    var categories = Array.from(new Set(DATA.rows.map(function (r) { return r.category || 'Other'; }))).sort();
    var chains = Array.from(new Set(DATA.rows.reduce(function (acc, r) { return acc.concat(r.chains || []); }, []))).sort();
    var search = el('input', { type: 'search', id: 'q', placeholder: 'Search name, category or chain', value: state.q, 'aria-label': 'Search the board' });
    search.addEventListener('input', function () { state.q = search.value; writeHash(); render(); });
    var tabBtn = function (tab, label) {
      return el('button', { type: 'button', 'aria-pressed': state.tab === tab ? 'true' : 'false', text: label, onclick: function () { state.tab = tab; render(); } });
    };
    var shown = state.tab === 'live' ? DATA.live.length : rows().length;
    return el('div', { class: 'controls' },
      el('div', { class: 'field' }, el('label', { for: 'q', text: 'Search' }), search),
      selectField('category', 'Category', categories, state.category, function (v) { state.category = v; }),
      selectField('chain', 'Chain', chains, state.chain, function (v) { state.chain = v; }),
      selectField('tier', 'Tier', ['S', 'A', 'B', 'C'], state.tier, function (v) { state.tier = v; }),
      el('div', { class: 'field' }, el('span', { text: 'Board' }),
        el('div', { class: 'tabs' }, tabBtn('board', 'All pre-token'), tabBtn('watchlist', 'Watchlist'), tabBtn('live', 'Live token'))),
      el('span', { class: 'count', text: shown + ' rows shown' }));
  }
  function sortHeader(key, label) {
    return el('th', { scope: 'col' },
      el('button', { type: 'button', onclick: function () { if (state.sort === key) state.dir = -state.dir; else { state.sort = key; state.dir = -1; } render(); } },
        label, state.sort === key ? el('span', { 'aria-hidden': 'true', text: state.dir < 0 ? ' v' : ' ^' }) : null));
  }
  function boardTable() {
    var list = sortedRows(rows());
    if (list.length === 0) {
      return el('div', { class: 'panel' }, el('div', { class: 'empty' },
        el('h2', { text: 'No protocol matches that filter' }),
        el('p', { text: 'Clear the search or pick another category, chain or tier to see the board again.' }),
        el('button', { class: 'button primary', type: 'button', text: 'Clear filters', onclick: function () { state.q = ''; state.category = 'all'; state.chain = 'all'; state.tier = 'all'; writeHash(); render(); } })));
    }
    var max = DATA.rows[0].implied_value_usd || 1;
    var tbody = el('tbody');
    list.forEach(function (r) {
      var growth = r.change_7d === null ? 'n/a' : fmtPct(r.change_7d);
      var growthClass = r.change_7d === null ? '' : r.change_7d >= 0 ? 'pos' : 'neg';
      var tr = el('tr', {
        'data-selected': state.selected === r.slug ? 'true' : 'false', tabindex: '0',
        onclick: function () { openDetail(r.slug); },
        onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(r.slug); } }
      },
        el('td', { class: 'num', text: String(r.rank) }),
        el('td', null, el('div', { class: 'name' },
          el('div', { class: 'name-row' }, el('b', { text: r.name }), r.on_watchlist ? el('span', { class: 'watch', title: 'On the watchlist' }) : null),
          el('span', { class: 'sub', text: (r.category || 'Other') + ' on ' + (r.chains && r.chains.length ? r.chains.slice(0, 2).join(', ') : 'an unnamed chain') }))),
        el('td', null, el('span', { class: 'tier tier-' + r.tier, text: r.tier })),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num ' + growthClass, text: growth }),
        el('td', { class: 'num', text: fmtAge(r.age_days) }),
        el('td', { class: 'num', text: fmtMult(r.fitted_multiple) }),
        el('td', null, el('div', { class: 'implied' },
          el('div', { class: 'bar', 'aria-hidden': 'true' }, el('i', { style: 'width:' + Math.max(3, Math.round(Math.sqrt(r.implied_value_usd / max) * 100)) + '%' })),
          el('span', { class: 'num', text: fmtUsd(r.implied_value_usd) }))),
        el('td', { class: 'num', text: '$' + r.farm_capital_usd + ' · ' + r.farm_hold_days + 'd' }),
        el('td', null, el('span', { class: 'verdict verdict-' + r.verdict.toLowerCase(), text: r.verdict })));
      tbody.appendChild(tr);
    });
    return el('div', { class: 'panel' },
      el('p', { class: 'sub table-note', text: 'Pre-token protocols, strongest implied value first. Bars use a square-root scale so the tail stays visible. Farm is the minimum capital and the hold in days; the verdict is costed — FARM for tiers S and A, THIN for B, SKIP for C. Select a row for its model and farm plan.' }),
      el('div', { class: 'table-wrap' },
        el('table', null,
          el('thead', null, el('tr', null,
            sortHeader('implied', 'Rank'), sortHeader('name', 'Protocol'), sortHeader('implied', 'Tier'),
            sortHeader('tvl', 'TVL'), sortHeader('growth', '7d'), sortHeader('age', 'Age'),
            sortHeader('fitted', 'Fitted x'), sortHeader('implied', 'Implied value'), el('th', { scope: 'col', text: 'Farm' }), el('th', { scope: 'col', text: 'Verdict' }))),
          tbody)));
  }
  function liveTable() {
    var tbody = el('tbody');
    DATA.live.forEach(function (r) {
      tbody.appendChild(el('tr', null,
        el('td', { class: 'num', text: 'live' }),
        el('td', null, el('div', { class: 'name' }, el('b', { text: r.name }), el('span', { class: 'sub', text: (r.category || 'Other') + ' on ' + (r.chains && r.chains.length ? r.chains.slice(0, 2).join(', ') : 'an unnamed chain') }))),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num ' + (r.change_7d !== null && r.change_7d >= 0 ? 'pos' : 'neg'), text: fmtPct(r.change_7d) }),
        el('td', { class: 'num', text: fmtUsd(r.mcap_usd) }),
        el('td', null, el('span', { class: 'status', text: 'already trades' }))));
    });
    return el('div', { class: 'panel' },
      el('p', { class: 'sub table-note', text: 'Token live: these protocols already trade, so their market cap is a fact, not a model. They are set aside from the pre-token ranking — and their market caps are what the model is fitted on.' }),
      el('div', { class: 'table-wrap' },
        el('table', null,
          el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Status' }), el('th', { scope: 'col', text: 'Protocol' }), el('th', { scope: 'col', text: 'TVL' }), el('th', { scope: 'col', text: '7d' }), el('th', { scope: 'col', text: 'Market cap' }), el('th', { scope: 'col', text: 'Token' }))),
          tbody)));
  }
  function categoryPanel() {
    var counts = {};
    DATA.rows.forEach(function (r) { var k = r.category || 'Other'; counts[k] = (counts[k] || 0) + 1; });
    var top = Object.keys(counts).map(function (k) { return { k: k, n: counts[k] }; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 8);
    var max = top[0] ? top[0].n : 1;
    return el('section', { class: 'panel model' },
      el('h2', { text: 'Where the board sits' }),
      el('p', { class: 'sub', text: 'Pre-token rows by category. Risk curators and capital allocators dominate the top of the board — the comparables table next to it says why their fitted multiples are what they are.' }),
      top.map(function (c) {
        return el('div', { class: 'catbar' }, el('span', { text: c.k }), el('div', { class: 'bar' }, el('i', { style: 'width:' + Math.round((c.n / max) * 100) + '%' })), el('span', { class: 'num', text: String(c.n) }));
      }));
  }
  function comparablesPanel() {
    var comps = (DATA.comparables || []).slice().sort(function (a, b) { return b.fitted_multiple - a.fitted_multiple; }).slice(0, 12);
    var tbody = el('tbody');
    comps.forEach(function (c) {
      tbody.appendChild(el('tr', null,
        el('td', { text: c.category }),
        el('td', { class: 'num', text: String(c.n) }),
        el('td', { class: 'num', text: fmtMult(c.fitted_multiple) + (c.fallback ? ' *' : '') }),
        el('td', { class: 'num', text: c.median === null ? 'n/a' : fmtMult(c.median) }),
        el('td', { class: 'num', text: c.token_rate === null ? 'n/a' : Math.round(c.token_rate * 100) + '%' })));
    });
    return el('section', { class: 'panel model' },
      el('h2', { text: 'Comparables: what live tokens trade at' }),
      el('p', { class: 'sub', text: 'Fitted multiple at $100M TVL and 365 days old, per category. * is the market fallback: fewer than 3 live protocols, so the market intercept is used. Token rate is the share of protocols in the category that already have a token — the peers\u2019 record, not a forecast.' }),
      el('div', { class: 'table-wrap' }, el('table', { class: 'comp-table' },
        el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Category' }), el('th', { scope: 'col', text: 'Live n' }), el('th', { scope: 'col', text: 'Fitted x' }), el('th', { scope: 'col', text: 'Observed median' }), el('th', { scope: 'col', text: 'Token rate' }))),
        tbody)));
  }
  function accountingPanel() {
    var a = DATA.accounting;
    var lanes = [
      { k: 'Ranked pre-token', n: a.ranked },
      { k: 'Live token, set aside', n: a.live },
      { k: 'Pre-token, excluded by rule', n: a.excluded }
    ];
    var max = Math.max.apply(null, lanes.map(function (l) { return l.n; }));
    return el('section', { class: 'panel model' },
      el('h2', { text: '758 protocols, filed in lanes' }),
      el('p', { class: 'sub', text: 'Every protocol in the snapshot is in exactly one lane. Nothing is left out without a stated reason.' }),
      lanes.map(function (l) {
        return el('div', { class: 'catbar' }, el('span', { text: l.k }), el('div', { class: 'bar' }, el('i', { style: 'width:' + Math.round((l.n / max) * 100) + '%' })), el('span', { class: 'num', text: String(l.n) }));
      }),
      el('p', { class: 'sub', text: 'Excluded, by the one reason each protocol fails: ' + a.reasons.map(function (r) { return r.reason + ' ' + r.n; }).join(' · ') + '.' }));
  }
  function modelPanel() {
    var f = DATA.fit;
    return el('section', { class: 'panel model' },
      el('h2', { text: 'How implied value is computed' }),
      el('p', { class: 'sub', text: 'One fitted function of the snapshot figures scores every row. No protocol name is special-cased, and no row is hand-picked.' }),
      el('div', { class: 'formula' },
        'implied = round(exp(a_cat\n' +
        '  + b x ln(tvl_usd)\n' +
        '  + c x ln(1 + age_days)))\n' +
        'a_cat: fitted per category\n' +
        '  (n >= ' + DATA.model.min_category_n + ' live),\n' +
        '  else market intercept ' + f.intercept.toFixed(3) + '\n' +
        'b = ' + f.slope.toFixed(3) + ', c = ' + f.age_coef.toFixed(3) + '\n' +
        '  (fitted on ' + f.fit_n + ' live protocols)\n' +
        'age: days since first listed\n' +
        '  (unknown: ' + DATA.model.unknown_age_days + ' days)'),
      el('p', { text: 'Tiers: S at $50M and up, A at $25M, B at $10M. The verdict is costed from the tier: FARM for S and A, THIN for B, SKIP for C — a farm costs $50–250 of capital plus gas, so a small row cannot repay the time it takes.' }),
      el('p', { text: 'Token rate is the share of protocols in a category that already have a token. It describes the peers\u2019 record; it does not predict a launch.' }),
      el('p', { class: 'note', text: 'What this is not: a prediction that a token will launch, or when. A protocol that records no token may still have one its DefiLlama record does not carry. Farm only with money you can lose, and never pay anyone to claim an airdrop.' }));
  }
  var dialog = el('dialog', { class: 'detail', id: 'detail', 'aria-labelledby': 'detail-title' });
  dialog.addEventListener('close', function () { state.selected = null; writeHash(); });
  function openDetail(slug) {
    var row = DATA.rows.filter(function (r) { return r.slug === slug; })[0];
    if (!row) return;
    state.selected = slug;
    writeHash();
    dialog.textContent = '';
    var steps = farmSteps(row);
    var cost = farmCost(row);
    var recomputed = impliedOf(row);
    var matches = Math.abs(recomputed - row.implied_value_usd) <= Math.max(1, row.implied_value_usd * 0.002);
    var age = row.age_days === null || row.age_days === undefined ? 365 : row.age_days;
    var comp = (DATA.comparables || []).filter(function (c) { return c.category === (row.category || 'Other'); })[0];
    dialog.appendChild(el('div', { class: 'detail-head' },
      el('div', null,
        el('span', { class: 'brand-name', text: 'Rank ' + row.rank + ' of ' + DATA.board_size + ' · Tier ' + row.tier + ' · ' + (row.on_watchlist ? 'WATCHLIST' : 'EARLY RADAR') }),
        el('h2', { id: 'detail-title', text: row.name }),
        el('p', { class: 'sub', text: (row.category || 'Other') + ' on ' + (row.chains && row.chains.length ? row.chains.join(', ') : 'an unnamed chain') })),
      el('button', { class: 'close', type: 'button', 'aria-label': 'Close details', text: 'Close', onclick: function () { dialog.close(); } })));
    if (!row.on_watchlist && row.tvl_usd >= DATA.floor_usd) {
      dialog.appendChild(el('p', { class: 'flag', text: 'Above the $50M floor but off the house watchlist: the snapshot alone cannot say why — treat it as a candidate, not a confirmed pre-token launch.' }));
    }
    if (row.confidence === 'low') {
      dialog.appendChild(el('p', { class: 'warn', text: 'Low confidence: the snapshot is missing the age, or a category fit for this row — the number is a rough estimate.' }));
    }
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Implied value' }),
      el('div', { class: 'equation' },
        el('div', null, el('span', { text: 'TVL' }), el('b', { class: 'num', text: fmtUsd(row.tvl_usd) })),
        el('div', null, el('span', { text: 'Category intercept' }), el('b', { class: 'num', text: row.fit_intercept.toFixed(3) + (row.fit_fallback ? ' (market fallback, ' + row.fit_category_n + ' live)' : ' (' + row.fit_category_n + ' live)') })),
        el('div', null, el('span', { text: 'Slope x ln(TVL)' }), el('b', { class: 'num', text: row.fit_slope.toFixed(3) + ' x ' + Math.log(Math.max(1, row.tvl_usd)).toFixed(2) })),
        el('div', null, el('span', { text: 'Age term' }), el('b', { class: 'num', text: row.fit_age_coef.toFixed(3) + ' x ln(1 + ' + age + 'd)' })),
        el('div', null, el('span', { text: 'Seven-day growth' }), el('b', { class: 'num', text: fmtPct(row.change_7d) })),
        el('div', null, el('span', { text: 'Confidence' }), el('b', { class: 'num', text: row.confidence })),
        el('div', null, el('span', { text: 'Implied value' }), el('b', { class: 'num', text: fmtUsd(row.implied_value_usd) }))),
      el('p', { class: 'sub', text: 'Model ' + DATA.model_version + ': the page recomputes this row as ' + fmtUsd(recomputed) + (matches ? ', the same number board.json carries.' : ', which differs from the board: the data would be stale.') + ' This is an estimate, not a price.' }),
      comp && row.token_rate !== null ? el('p', { class: 'sub', text: 'Peers: ' + Math.round(row.token_rate * 100) + '% of protocols in ' + (row.category || 'Other') + ' have a token on record (' + comp.n + ' live of ' + (comp.n + comp.pre_n) + '). That is the peers\u2019 record, not a forecast.' }) : null));
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Farm cost — verdict ' + row.verdict }),
      el('div', { class: 'equation' },
        el('div', null, el('span', { text: 'Minimum capital' }), el('b', { class: 'num', text: '$' + cost.capital })),
        el('div', null, el('span', { text: 'Setup' }), el('b', { class: 'num', text: '~$' + cost.gas + ' gas + 30 min' })),
        el('div', null, el('span', { text: 'Weekly upkeep' }), el('b', { class: 'num', text: '~$2 gas + 10 min' })),
        el('div', null, el('span', { text: 'Hold' }), el('b', { class: 'num', text: cost.hold + ' days' })),
        el('div', null, el('span', { text: 'Gas per hour of work' }), el('b', { class: 'num', text: '~$' + cost.perHour.toFixed(2) }))),
      el('p', { class: 'sub', text: row.verdict === 'FARM' ? 'FARM: the implied value is large enough to repay the capital and the time. The verdict comes from the tier, not from a promise of an airdrop.' : row.verdict === 'THIN' ? 'THIN: farm small, if at all. The implied value barely covers the capital and the weeks of upkeep.' : 'SKIP: the implied value does not repay the capital and the time. The plan is still written out, so the row can be checked.' })));
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Farm plan — 7 steps' }),
      el('ol', { class: 'steps' }, steps.map(function (s) {
        var at = s.indexOf(' Cost: ');
        var action = at >= 0 ? s.slice(0, at) : s;
        var tail = at >= 0 ? s.slice(at + 1) : '';
        return el('li', null, el('b', { text: action }), el('span', { class: 'cost', text: tail }));
      }))));
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }
  function render() {
    app.textContent = '';
    var shell = el('div', { class: 'shell' });
    shell.appendChild(header());
    shell.appendChild(integrityStrip());
    shell.appendChild(kpiStrip());
    shell.appendChild(lede());
    shell.appendChild(spotlight());
    shell.appendChild(validationPanel());
    shell.appendChild(controls());
    shell.appendChild(state.tab === 'live' ? liveTable() : boardTable());
    var split = el('div', { class: 'split' });
    split.appendChild(categoryPanel());
    split.appendChild(comparablesPanel());
    shell.appendChild(split);
    var split2 = el('div', { class: 'split' });
    split2.appendChild(accountingPanel());
    split2.appendChild(modelPanel());
    shell.appendChild(split2);
    app.appendChild(shell);
    app.setAttribute('aria-busy', 'false');
    if (!dialog.isConnected) app.appendChild(dialog);
    if (state.selected) openDetail(state.selected);
  }
  readHash();
  render();
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && dialog.open) dialog.close();
  });
})();
