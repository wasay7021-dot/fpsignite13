/* FPS IGNITE XIII - Foreign X Change (currency trading round).
   Needs app.js loaded first. Same storage model as app.js: browser-only demo data. */
(function () {
  'use strict';
  var A = window.IGNITE;
  if (!A) return;
  var esc = A.esc, find = A.find, uid = A.uid;

  var CUR = [['usd', 'Dollar', 25], ['eur', 'Euro', 10], ['cny', 'Yuan', 18], ['jpy', 'Yen', 5], ['rub', 'Ruble', 12], ['sar', 'Riyal', 39]];
  var ROUNDS = 10, START_IC = 2500, MAXAMT = 1000000;
  var LABEL = { closed: 'Not started', open: 'Trading open', paused: 'Paused', finished: 'Finished' };
  var PILL = { closed: '', open: 'open', paused: 'paused', finished: 'won' };

  function $(id) { return document.getElementById(id); }
  function nameOf(c) { for (var i = 0; i < CUR.length; i++) if (CUR[i][0] === c) return CUR[i][1]; return c; }

  /* make sure forex state exists and every delegation has an IC balance + holdings */
  function fx(s) {
    var ch = false;
    if (!s.forex) {
      var base = {}, rounds = [];
      CUR.forEach(function (c) { base[c[0]] = c[2]; });
      for (var i = 0; i < ROUNDS; i++) rounds.push({ crisis: '', rates: JSON.parse(JSON.stringify(base)) });
      s.forex = { status: 'closed', round: 1, rounds: rounds, trades: [] };
      ch = true;
    }
    s.delegations.forEach(function (d) {
      if (typeof d.ic !== 'number') { d.ic = START_IC; ch = true; }
      if (!d.hold) { d.hold = {}; ch = true; }
      CUR.forEach(function (c) { if (typeof d.hold[c[0]] !== 'number') { d.hold[c[0]] = 0; ch = true; } });
    });
    if (ch) A.save(s);
    return s.forex;
  }
  function price(f, c) { return f.rounds[f.round - 1].rates[c]; }
  function total(f, d) { var t = d.ic; CUR.forEach(function (c) { t += (d.hold[c[0]] || 0) * price(f, c[0]); }); return t; }
  function standings(s, f) {
    return s.delegations.map(function (d) { return { d: d, total: total(f, d) }; }).sort(function (a, b) { return b.total - a.total; });
  }

  /* one buy or sell. Mutates s; caller saves. */
  function trade(s, d, side, cur, amt) {
    var f = fx(s);
    if (f.status !== 'open') return { ok: false, msg: 'Trading is not open right now.' };
    if (!(amt > 0) || amt > MAXAMT) return { ok: false, msg: 'Enter a whole number of units above 0.' };
    var p = price(f, cur), cost = amt * p, n = nameOf(cur);
    if (side === 'buy') {
      if (cost > d.ic) return { ok: false, msg: 'Not enough ICs. ' + amt + ' ' + n + ' costs ' + cost + ' ICs.' };
      d.ic -= cost; d.hold[cur] += amt;
    } else {
      if (amt > d.hold[cur]) return { ok: false, msg: 'You only own ' + d.hold[cur] + ' ' + n + '.' };
      d.ic += cost; d.hold[cur] -= amt;
    }
    f.trades.push({ id: uid(), delegationId: d.id, cur: cur, side: side, amount: amt, price: p, round: f.round, time: Date.now() });
    return { ok: true, msg: (side === 'buy' ? 'Bought ' : 'Sold ') + amt + ' ' + n + ' for ' + cost + ' ICs.' };
  }
  function advance(s) { var f = fx(s); if (f.round < ROUNDS) { f.round++; f.status = 'paused'; } else f.status = 'finished'; }
  function resetAll(s) {
    var f = fx(s); f.status = 'closed'; f.round = 1; f.trades = [];
    s.delegations.forEach(function (d) { d.ic = START_IC; CUR.forEach(function (c) { d.hold[c[0]] = 0; }); });
  }
  A.forex = { CUR: CUR, ROUNDS: ROUNDS, START_IC: START_IC, fx: fx, price: price, total: total, standings: standings, trade: trade, advance: advance, resetAll: resetAll };

  if (typeof document === 'undefined') return;

  /* ---------- delegate page ---------- */
  function delegatePage() {
    var root = $('content'), msg = '', msgOk = false;
    function say(t, ok) { msg = t; msgOk = !!ok; }

    function draw() {
      var s = A.load(), f = fx(s), u = A.currentUser(s);
      var d = u && u.delegationId ? find(s.delegations, u.delegationId) : null;
      var rd = f.rounds[f.round - 1], prev = f.round > 1 ? f.rounds[f.round - 2] : null;
      var live = f.status !== 'closed', can = !!d && f.status === 'open';

      var h = '<div class="eyebrow">FPS IGNITE XIII</div><h1 class="title">Foreign X <span class="red">Change</span></h1>';
      h += '<div class="card"><div class="row-between"><div><div class="label gold">Your delegation</div><div class="big">' + (d ? esc(d.name) : (u ? 'Organizer account' : 'Sign in to participate')) + '</div></div>';
      h += '<div style="text-align:center"><div class="label gold">Round</div><div class="big">' + f.round + ' of ' + ROUNDS + '</div><span class="pill ' + PILL[f.status] + '" style="margin-top:6px">' + LABEL[f.status] + '</span></div>';
      h += '<div style="text-align:right"><div class="label gold">Balance</div><div class="big red">' + (d ? d.ic + ' ICs' : '&mdash; ICs') + '</div></div></div>';
      if (!u) h += '<div class="note">Enter the delegate portal to participate. <a class="red" href="login.html"><b>Login &#8599;</b></a></div>';
      else if (!d) h += '<div class="note">You are signed in as an organizer. Delegates trade from their own accounts.</div>';
      else if (f.status === 'closed') h += '<div class="note">The exchange has not opened yet.</div>';
      else if (f.status === 'paused') h += '<div class="note">Trading is paused. Read the briefing and wait for the organizers to open the round.</div>';
      else if (f.status === 'finished') h += '<div class="note">The exchange is closed. Final standings are below.</div>';
      if (d) h += '<div class="help">Holdings are worth ' + (total(f, d) - d.ic) + ' ICs at current rates &middot; Total ' + total(f, d) + ' ICs</div>';
      if (msg) h += '<div class="msg' + (msgOk ? ' ok' : '') + '">' + esc(msg) + '</div>';
      h += '</div>';

      if (live) h += '<div class="card"><div class="label gold">Global crisis briefing &middot; Round ' + f.round + '</div><p class="crisis">' + (rd.crisis ? esc(rd.crisis) : 'Awaiting briefing from the organizers.') + '</p></div>';

      h += '<div class="fxlayout"><div class="fxgrid">';
      CUR.forEach(function (c) {
        h += '<div class="fx"><div class="label gold">' + c[1] + '</div><div class="px">' + (live ? rd.rates[c[0]] + ' ICs' : '&mdash;') + '</div>';
        h += '<input type="number" min="1" step="1" placeholder="Enter amount" data-in="' + c[0] + '"' + (can ? '' : ' disabled') + '>';
        h += '<div class="fxbtns"><button class="btn small" data-buy="' + c[0] + '"' + (can ? '' : ' disabled') + '>Buy</button><button class="btn small dark" data-sell="' + c[0] + '"' + (can ? '' : ' disabled') + '>Sell</button></div>';
        h += '<div class="owned">Owned: ' + (d ? d.hold[c[0]] : 0) + '</div></div>';
      });
      h += '</div><div class="card" style="margin:0"><div class="label gold" style="margin-bottom:12px">Exchange rates</div><div class="list">';
      CUR.forEach(function (c) {
        var delta = '';
        if (live && prev) { var df = rd.rates[c[0]] - prev.rates[c[0]]; if (df > 0) delta = ' <span class="up">&#9650; ' + df + '</span>'; else if (df < 0) delta = ' <span class="down">&#9660; ' + (-df) + '</span>'; }
        h += '<div class="item"><b>' + c[1] + '</b><span>' + (live ? rd.rates[c[0]] + ' ICs' + delta : '&mdash;') + '</span></div>';
      });
      h += '</div><div class="help">The same rate applies to buying and selling. Rates change every round.</div></div></div>';

      if (d) {
        var mine = f.trades.filter(function (t) { return t.delegationId === d.id; }).slice(-6).reverse();
        h += '<div class="card" style="margin-top:18px"><div class="label gold">Your recent trades</div><div class="list">';
        h += mine.length ? mine.map(function (t) { return '<div class="item"><span>Round ' + t.round + ' &middot; ' + (t.side === 'buy' ? 'Bought' : 'Sold') + ' ' + t.amount + ' ' + nameOf(t.cur) + '</span><b>' + (t.amount * t.price) + ' ICs</b></div>'; }).join('') : '<div class="item"><span>No trades yet.</span></div>';
        h += '</div></div>';
      }
      if (f.status === 'finished' || (u && u.role === 'admin')) {
        var st = standings(s, f);
        h += '<div class="card"><div class="label gold" style="margin-bottom:12px">' + (f.status === 'finished' ? 'Final standings' : 'Live standings (organizers only)') + '</div><div class="list">';
        h += st.map(function (x, i) { return '<div class="item"><span><b>' + (i + 1) + '. ' + esc(x.d.name) + '</b>' + (i === 0 && f.status === 'finished' ? ' <span class="pill won">Winner</span>' : '') + '<small>' + x.d.ic + ' ICs cash</small></span><b>' + x.total + ' ICs</b></div>'; }).join('');
        h += '</div></div>';
      }
      root.innerHTML = h;

      function act(side, el, cur) {
        el.addEventListener('click', function () {
          var inp = root.querySelector('[data-in="' + cur + '"]'), amt = Math.floor(Number(inp.value));
          var st = A.load(), uu = A.currentUser(st), dd = uu && uu.delegationId ? find(st.delegations, uu.delegationId) : null;
          if (!dd) { say('Sign in with a delegate account to trade.'); return draw(); }
          var r = trade(st, dd, side, cur, amt);
          if (r.ok) A.save(st);
          say(r.msg, r.ok); draw();
        });
      }
      Array.prototype.forEach.call(root.querySelectorAll('[data-buy]'), function (b) { act('buy', b, b.getAttribute('data-buy')); });
      Array.prototype.forEach.call(root.querySelectorAll('[data-sell]'), function (b) { act('sell', b, b.getAttribute('data-sell')); });
    }
    draw();
  }

  /* ---------- organizer page ---------- */
  function adminPage() {
    var root = $('content'), note = '', edit = null;
    function draw() {
      var s = A.load(), f = fx(s), u = A.currentUser(s);
      if (!u || u.role !== 'admin') { root.innerHTML = '<div class="card">This page is for organizers. <a class="red" href="login.html"><b>Admin login &#8599;</b></a></div>'; return; }
      if (edit == null) edit = f.round;
      var er = f.rounds[edit - 1];
      var h = '<a class="back" href="admin.html">&larr; Admin panel</a><h1 class="title" style="margin-top:14px">Foreign X <span class="red">Change</span></h1>';
      if (note) h += '<p class="msg ok" style="margin:-8px 0 16px">' + esc(note) + '</p>';

      h += '<div class="card"><div class="row-between"><div><div class="label gold">Exchange status</div><h2>Round ' + f.round + ' of ' + ROUNDS + '</h2></div><span class="pill ' + PILL[f.status] + '">' + LABEL[f.status] + '</span></div>';
      h += '<div class="btnrow">';
      h += '<button class="btn small" data-act="start"' + (f.status === 'closed' || f.status === 'paused' ? '' : ' disabled') + '>' + (f.status === 'paused' ? 'Resume trading' : 'Open trading') + '</button>';
      h += '<button class="btn small ghost" data-act="pause"' + (f.status === 'open' ? '' : ' disabled') + '>Pause</button>';
      h += '<button class="btn small ghost" data-act="next"' + (f.status === 'open' || f.status === 'paused' ? '' : ' disabled') + '>' + (f.round < ROUNDS ? 'End round ' + f.round + ' &amp; next' : 'End final round &amp; finish') + '</button>';
      h += '<button class="btn small dark" data-act="reset">Reset exchange (testing)</button></div>';
      h += '<div class="help">Delegates see only the current round&rsquo;s crisis and rates. After ending a round the exchange pauses so you can brief the next crisis; then open trading.</div></div>';

      h += '<form class="card" id="f-round"><h2 style="margin-bottom:16px">Round setup</h2><div class="field"><label>Round</label><select id="r-sel">';
      for (var i = 1; i <= ROUNDS; i++) h += '<option value="' + i + '"' + (i === edit ? ' selected' : '') + '>Round ' + i + (i === f.round ? ' (current)' : '') + '</option>';
      h += '</select></div><div class="field"><label>Global crisis briefing (shown to delegates)</label><textarea id="r-crisis" rows="4" placeholder="Describe the crisis delegates must analyse">' + esc(er.crisis) + '</textarea></div><div class="two">';
      CUR.forEach(function (c) { h += '<div class="field"><label>' + c[1] + ' rate (ICs)</label><input type="number" min="1" step="1" id="p-' + c[0] + '" value="' + er.rates[c[0]] + '" required></div>'; });
      h += '</div><button class="btn" type="submit">Save round ' + edit + '</button></form>';

      var st = standings(s, f);
      h += '<div class="card"><h2 style="margin-bottom:8px">Standings</h2><div class="list">';
      h += st.length ? st.map(function (x, i) { return '<div class="item"><span><b>' + (i + 1) + '. ' + esc(x.d.name) + '</b><small>' + x.d.ic + ' ICs cash</small></span><b>' + x.total + ' ICs</b></div>'; }).join('') : '<div class="item"><span>No delegations yet.</span></div>';
      h += '</div><div class="help">Total = cash + holdings valued at the current round&rsquo;s rates.</div></div>';

      var tr = f.trades.slice(-20).reverse();
      h += '<div class="card"><h2 style="margin-bottom:8px">Recent trades</h2><div class="list">';
      h += tr.length ? tr.map(function (t) { var d = find(s.delegations, t.delegationId); return '<div class="item"><span>' + esc(d ? d.name : '?') + ' &middot; R' + t.round + ' &middot; ' + (t.side === 'buy' ? 'Bought' : 'Sold') + ' ' + t.amount + ' ' + nameOf(t.cur) + '</span><b>' + (t.amount * t.price) + ' ICs</b></div>'; }).join('') : '<div class="item"><span>No trades yet.</span></div>';
      h += '</div></div>';
      root.innerHTML = h;

      $('r-sel').addEventListener('change', function () { edit = Number($('r-sel').value); note = ''; draw(); });
      $('f-round').addEventListener('submit', function (e) {
        e.preventDefault();
        var st2 = A.load(), f2 = fx(st2), r = f2.rounds[edit - 1], ok = true;
        CUR.forEach(function (c) { var v = Math.floor(Number($('p-' + c[0]).value)); if (!(v >= 1)) ok = false; });
        if (!ok) { note = 'Every rate must be a whole number of at least 1 IC.'; return draw(); }
        CUR.forEach(function (c) { r.rates[c[0]] = Math.floor(Number($('p-' + c[0]).value)); });
        r.crisis = $('r-crisis').value.trim();
        A.save(st2); note = 'Round ' + edit + ' saved.'; draw();
      });
      Array.prototype.forEach.call(root.querySelectorAll('[data-act]'), function (b) {
        b.addEventListener('click', function () {
          var st2 = A.load(), f2 = fx(st2), a = b.getAttribute('data-act');
          if (a === 'start' && (f2.status === 'closed' || f2.status === 'paused')) { f2.status = 'open'; note = 'Round ' + f2.round + ' is open for trading.'; }
          else if (a === 'pause' && f2.status === 'open') { f2.status = 'paused'; note = 'Trading paused.'; }
          else if (a === 'next' && (f2.status === 'open' || f2.status === 'paused')) {
            if (!confirm(f2.round < ROUNDS ? 'End round ' + f2.round + ' and move to round ' + (f2.round + 1) + '?' : 'End the final round and finish the exchange?')) return;
            advance(st2); edit = null; note = f2.status === 'finished' ? 'Exchange finished. Final standings are live for everyone.' : 'Now on round ' + f2.round + ' (paused).';
          }
          else if (a === 'reset') {
            if (!confirm('Reset the exchange? Every delegation goes back to ' + START_IC + ' ICs with no holdings, and all trades are erased.')) return;
            resetAll(st2); edit = null; note = 'Exchange reset.';
          }
          else return;
          A.save(st2); draw();
        });
      });
    }
    draw();
  }

  document.addEventListener('DOMContentLoaded', function () {
    var p = document.body.getAttribute('data-page');
    if (p === 'forex') delegatePage();
    else if (p === 'forex-admin') adminPage();
  });
})();
