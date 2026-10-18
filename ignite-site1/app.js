/* FPS IGNITE XIII - shared logic.
   Data is stored in the browser (localStorage), so this build works as a single-device demo.
   For real multi-user use, swap load()/save() for a hosted database (e.g. Supabase / Firebase). */
(function () {
  'use strict';
  var KEY = 'ignite_state_v1', SKEY = 'ignite_session_v1';
  var IND = ['Cybersecurity & Artificial Intelligence (AI)', 'Fashion & Self-Care', 'Film', 'Construction & Real-Estate', 'Fintech & Digital Banking', 'Sports & Gaming', 'Biotech & Health', 'Edtech & Future of Learning', 'Aerospace & Aeronautical', 'Smart Home Technology'];
  var ROOMS = [['Green Screen Room', 150], ['Office', 100], ['Library', 75], ['Lounge', 50]];
  var ROLES = [['cw', 'Content Writer'], ['vg', 'Videographer'], ['tw', 'Techno-wiz'], ['sp', 'Spokesperson']];

  function uid() { return Math.random().toString(36).slice(2, 10); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(id) { return document.getElementById(id); }
  function find(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return null; }
  function plural(n) { return n + ' place' + (n === 1 ? '' : 's'); }

  function seed() {
    var events = [];
    IND.forEach(function (n, i) { events.push({ id: 'i' + i, type: 'industry', name: n, places: 10, cost: 0, status: i === 0 ? 'closed' : 'open' }); });
    ROOMS.forEach(function (r, i) { events.push({ id: 'r' + i, type: 'room', name: r[0], places: 1, cost: r[1], status: 'open' }); });
    return {
      events: events,
      delegations: [{ id: 'd1', name: 'Demo Delegation', campus: 'FPS', balance: 1000, members: { cw: '', vg: '', tw: '', sp: '' }, head: 'cw' }],
      users: [
        { email: 'admin@ignite.local', password: 'admin123', role: 'admin', delegationId: null },
        { email: 'demo@ignite.local', password: 'demo123', role: 'delegate', delegationId: 'd1' }
      ],
      bids: [], reservations: []
    };
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.events) return s; } catch (e) {}
    var n = seed(); save(n); return n;
  }
  function currentUser(s) {
    var em = null; try { em = localStorage.getItem(SKEY); } catch (e) {}
    if (!em) return null;
    for (var i = 0; i < s.users.length; i++) if (s.users[i].email === em) return s.users[i];
    return null;
  }
  function setSession(email) { try { if (email) localStorage.setItem(SKEY, email); else localStorage.removeItem(SKEY); } catch (e) {} }

  /* ---------- settlement (also exposed for testing) ---------- */
  function settle(s, eventId) {
    var ev = find(s.events, eventId);
    if (!ev) return;
    if (ev.type === 'industry') {
      var already = s.bids.filter(function (b) { return b.eventId === ev.id && b.status === 'won'; }).length;
      var pending = s.bids.filter(function (b) { return b.eventId === ev.id && b.status === 'pending'; })
        .sort(function (a, b) { return b.amount - a.amount || a.time - b.time; });
      pending.forEach(function (b) {
        var d = find(s.delegations, b.delegationId);
        if (d && already < ev.places && b.amount <= d.balance) { d.balance -= b.amount; b.status = 'won'; already++; }
        else b.status = 'lost';
      });
    }
    ev.status = 'closed';
  }

  /* ---------- header / footer ---------- */
  function renderChrome(active) {
    var s = load(), u = currentUser(s);
    var links = [['index.html', 'Home', 'home'], ['about.html', 'About', 'about'], ['events.html', 'Events', 'events']];
    if (u) { links.push(['profile.html', 'Profile', 'profile']); if (u.role === 'admin') links.push(['admin.html', 'Admin', 'admin']); }
    var h = '<header class="site"><div class="container"><a class="logo" href="index.html"><img src="logo.svg" alt="FPS IGNITE XIII"></a><nav class="main">';
    links.forEach(function (l) { h += '<a href="' + l[0] + '"' + (active === l[2] ? ' class="active"' : '') + '>' + l[1] + '</a>'; });
    h += u ? '<a href="#" id="signout">Sign out</a>' : '<a href="login.html"' + (active === 'login' ? ' class="active"' : '') + '>Login portal &#8599;</a>';
    h += '</nav></div></header>';
    $('app-header').innerHTML = h;
    $('app-footer').innerHTML = '<footer class="site"><div class="container"><div class="l"><b>FPS IGNITE XIII</b><span>Foundation Public School &middot; Ideas into action.</span><a href="events.html">Event information</a></div><div>&copy; 2026 FPS IGNITE</div></div></footer>';
    var so = $('signout');
    if (so) so.addEventListener('click', function (e) { e.preventDefault(); setSession(null); location.href = 'index.html'; });
  }

  /* ---------- events (auction + rooms) ---------- */
  function eventPage(type) {
    var root = $('content'), sel = null, msg = '', msgOk = false;
    function say(t, ok) { msg = t; msgOk = !!ok; }
    function draw() {
      var s = load(), u = currentUser(s);
      var d = u && u.delegationId ? find(s.delegations, u.delegationId) : null;
      var evs = s.events.filter(function (e) { return e.type === type; });
      if (!sel || !find(evs, sel)) sel = evs[0].id;
      var ev = find(evs, sel), isInd = type === 'industry';
      var h = '';
      if (isInd) h += '<div class="eyebrow"><span class="red">&bull;</span> All events</div><h1 class="title" style="margin-top:14px">Industry <span class="red">Auction</span></h1>';
      else h += '<a class="back" href="events.html">&larr; All events</a><h1 class="title" style="margin-top:14px">Room <span class="red">Booking</span></h1>';

      h += '<div class="card"><div class="row-between"><div><div class="label gold">Your delegation</div><div class="big">' + (d ? esc(d.name) : (u ? 'Admin account' : 'Sign in to participate')) + '</div></div><div style="text-align:right"><div class="label gold">CR left</div><div class="big red">' + (d ? d.balance + ' CR' : '&mdash; CR') + '</div></div></div></div>';

      var myBid = d ? s.bids.filter(function (b) { return b.eventId === ev.id && b.delegationId === d.id; })[0] : null;
      var myRes = d ? s.reservations.filter(function (r) { return r.eventId === ev.id && r.delegationId === d.id; })[0] : null;
      var taken = s.reservations.filter(function (r) { return r.eventId === ev.id; }).length;
      var wonCount = s.bids.filter(function (b) { return b.eventId === ev.id && b.status === 'won'; }).length;

      h += '<div class="card"><div class="row-between"><div><div class="label gold">' + (isInd ? 'Your industry' : 'Your room') + '</div><h2>' + esc(ev.name) + '</h2></div><span class="pill ' + ev.status + '">' + ev.status + '</span></div>';
      h += '<div class="boxes">';
      if (isInd) {
        h += '<div class="box"><div class="label gold">Availability</div><b>' + plural(ev.places - wonCount) + '</b></div>';
        h += '<div class="box"><div class="label gold">Your bid</div><b>' + (myBid ? myBid.amount + ' CR' + (myBid.status !== 'pending' ? ' &middot; ' + myBid.status : '') : 'None yet') + '</b></div>';
        h += '<div class="box"><div class="label gold">Allocation</div><b>Top ' + ev.places + ' eligible bids</b></div>';
      } else {
        h += '<div class="box"><div class="label gold">Availability</div><b>' + plural(ev.places - taken) + '</b></div>';
        h += '<div class="box"><div class="label gold">Your booking</div><b>' + (myRes ? 'Booked' : 'None yet') + '</b></div>';
        h += '<div class="box"><div class="label gold">Room cost</div><b>' + ev.cost + ' CR</b></div>';
      }
      h += '</div>';

      if (!u) h += '<div class="note">Enter the delegate portal to participate. <a class="red" href="login.html"><b>Login &#8599;</b></a></div>';
      else if (!d) h += '<div class="note">You are signed in as an organizer. Delegates place bids and bookings from their own accounts.</div>';
      else if (ev.status === 'closed') h += '<div class="note">This ' + (isInd ? 'industry' : 'room') + ' is closed.</div>';
      else if (ev.status === 'paused') h += '<div class="note">Paused by the organizers. Please check back shortly.</div>';
      else if (isInd) {
        h += '<form id="bidform" class="note"><div class="inline"><input type="number" id="bidamt" min="1" step="1" placeholder="Your bid in CR" value="' + (myBid ? myBid.amount : '') + '"><button class="btn small" type="submit">' + (myBid ? 'Update bid' : 'Place bid') + '</button>' + (myBid ? '<button class="btn small dark" type="button" id="withdraw">Withdraw</button>' : '') + '</div></form>';
      } else if (myRes) h += '<div class="note">You have reserved this room for ' + myRes.cost + ' CR.</div>';
      else if (ev.places - taken <= 0) h += '<div class="note">This room is already taken.</div>';
      else h += '<div class="note" style="display:flex;justify-content:space-between;align-items:center;gap:10px"><span>Reserve for ' + ev.cost + ' CR.</span><button class="btn small" id="book">Reserve room</button></div>';

      h += '<div class="help">' + (isInd ? 'Highest bids win up to ' + ev.places + ' places per industry. Ties go to the earliest bid. Bids must fit your balance at settlement.' : 'Reservations use your remaining auction credits. The organizer controls room availability.') + '</div>';
      if (msg) h += '<div class="msg' + (msgOk ? ' ok' : '') + '">' + esc(msg) + '</div>';

      if (isInd) {
        var bids = s.bids.filter(function (b) { return b.eventId === ev.id; }).sort(function (a, b) { return b.amount - a.amount || a.time - b.time; });
        h += '<div class="label gold" style="margin-top:22px">Live bids &middot; ' + bids.length + '</div>';
        h += bids.length ? '<div class="list" style="background:var(--card2);border-radius:6px;padding:4px 14px">' + bids.map(function (b) { var dd = find(s.delegations, b.delegationId); return '<div class="item"><b>' + esc(dd ? dd.name : '?') + '</b><span>' + b.amount + ' CR &middot; <span class="pill ' + b.status + '">' + b.status + '</span></span></div>'; }).join('') + '</div>' : '<div class="note">No bids yet.</div>';
      } else {
        var rs = s.reservations.filter(function (r) { return r.eventId === ev.id; });
        h += '<div class="label gold" style="margin-top:22px">Live reservations &middot; ' + rs.length + '</div>';
        h += rs.length ? '<div class="list" style="background:var(--card2);border-radius:6px;padding:4px 14px">' + rs.map(function (r) { var dd = find(s.delegations, r.delegationId); return '<div class="item"><b>' + esc(dd ? dd.name : '?') + '</b><span>' + r.cost + ' CR</span></div>'; }).join('') + '</div>' : '<div class="note">No reservations yet.</div>';
      }
      h += '</div>';

      h += '<div class="card"><div class="label gold" style="margin-bottom:12px">' + (isInd ? 'All industries' : 'All rooms') + '</div><div class="list">';
      evs.forEach(function (e) {
        var sub = isInd ? plural(e.places) : plural(e.places) + ' &middot; ' + e.cost + ' CR';
        h += '<div class="item click' + (e.id === sel ? ' selected' : '') + '" data-ev="' + e.id + '"><div><b>' + esc(e.name) + '</b><small>' + sub + '</small></div><span class="pill ' + e.status + '">' + e.status + '</span></div>';
      });
      h += '</div></div>';
      root.innerHTML = h;

      Array.prototype.forEach.call(root.querySelectorAll('[data-ev]'), function (el) {
        el.addEventListener('click', function () { sel = el.getAttribute('data-ev'); say(''); draw(); });
      });
      var f = $('bidform');
      if (f) f.addEventListener('submit', function (e) {
        e.preventDefault();
        var amt = Math.floor(Number($('bidamt').value));
        var st = load(), uu = currentUser(st), dd = uu && find(st.delegations, uu.delegationId), evv = find(st.events, sel);
        if (!dd || evv.status !== 'open') { say('Bidding is not open right now.'); return draw(); }
        if (!(amt > 0)) { say('Enter a bid above 0.'); return draw(); }
        if (amt > dd.balance) { say('That bid is more than your ' + dd.balance + ' CR balance.'); return draw(); }
        var ex = st.bids.filter(function (b) { return b.eventId === evv.id && b.delegationId === dd.id; })[0];
        if (ex) { ex.amount = amt; ex.time = Date.now(); ex.status = 'pending'; }
        else st.bids.push({ id: uid(), eventId: evv.id, delegationId: dd.id, amount: amt, time: Date.now(), status: 'pending' });
        save(st); say('Bid of ' + amt + ' CR recorded. It is deducted only if you win at settlement.', true); draw();
      });
      var w = $('withdraw');
      if (w) w.addEventListener('click', function () {
        var st = load(), uu = currentUser(st);
        st.bids = st.bids.filter(function (b) { return !(b.eventId === sel && b.delegationId === uu.delegationId && b.status === 'pending'); });
        save(st); say('Bid withdrawn.', true); draw();
      });
      var bk = $('book');
      if (bk) bk.addEventListener('click', function () {
        var st = load(), uu = currentUser(st), dd = uu && find(st.delegations, uu.delegationId), evv = find(st.events, sel);
        var tk = st.reservations.filter(function (r) { return r.eventId === evv.id; }).length;
        if (!dd || evv.status !== 'open') { say('Booking is not open right now.'); return draw(); }
        if (tk >= evv.places) { say('This room was just taken.'); return draw(); }
        if (dd.balance < evv.cost) { say('Not enough CR. You need ' + evv.cost + ' CR.'); return draw(); }
        dd.balance -= evv.cost;
        st.reservations.push({ id: uid(), eventId: evv.id, delegationId: dd.id, cost: evv.cost, time: Date.now(), status: 'won' });
        save(st); say('Room reserved.', true); draw();
      });
    }
    draw();
  }

  /* ---------- login ---------- */
  function loginPage() {
    var role = 'delegate';
    var tabs = document.querySelectorAll('.tabs button');
    Array.prototype.forEach.call(tabs, function (b) {
      b.addEventListener('click', function () {
        role = b.getAttribute('data-role');
        Array.prototype.forEach.call(tabs, function (x) { x.classList.toggle('on', x === b); });
        $('err').textContent = '';
      });
    });
    $('loginform').addEventListener('submit', function (e) {
      e.preventDefault();
      var s = load(), em = $('email').value.trim().toLowerCase(), pw = $('password').value;
      var u = s.users.filter(function (x) { return x.email.toLowerCase() === em && x.password === pw; })[0];
      if (!u) { $('err').textContent = 'Incorrect email or password.'; return; }
      if (u.role !== role) { $('err').textContent = u.role === 'admin' ? 'This is an admin account. Use the Admin portal tab.' : 'This is a delegate account. Use the Delegate portal tab.'; return; }
      setSession(u.email);
      location.href = u.role === 'admin' ? 'admin.html' : 'events.html';
    });
  }

  /* ---------- profile ---------- */
  function profilePage() {
    var s = load(), u = currentUser(s), root = $('content');
    if (!u) { root.innerHTML = '<div class="card">Please <a class="red" href="login.html"><b>sign in</b></a> to see your profile.</div>'; return; }
    var d = u.delegationId ? find(s.delegations, u.delegationId) : null;
    var h = '<div class="card"><div class="label gold">Account</div><div class="big">' + esc(u.email) + '</div><div class="help">' + (u.role === 'admin' ? 'Administrator' : 'Delegate') + '</div></div>';
    if (d) {
      h += '<div class="card"><div class="row-between"><div><div class="label gold">Delegation</div><h2>' + esc(d.name) + '</h2><div class="help">' + esc(d.campus) + ' campus</div></div><div style="text-align:right"><div class="label gold">CR left</div><div class="big red">' + d.balance + ' CR</div></div></div><div class="list" style="margin-top:14px">';
      ROLES.forEach(function (r) { h += '<div class="item"><span>' + r[1] + (d.head === r[0] ? ' <span class="pill">Head delegate</span>' : '') + '</span><b>' + esc(d.members[r[0]] || '—') + '</b></div>'; });
      h += '</div></div>';
      var mine = s.bids.filter(function (b) { return b.delegationId === d.id; }), rs = s.reservations.filter(function (r) { return r.delegationId === d.id; });
      h += '<div class="card"><div class="label gold">Your activity</div><div class="list">';
      if (!mine.length && !rs.length) h += '<div class="item"><span>Nothing yet.</span></div>';
      mine.forEach(function (b) { var e = find(s.events, b.eventId); h += '<div class="item"><span>' + esc(e ? e.name : '') + '</span><span>' + b.amount + ' CR &middot; <span class="pill ' + b.status + '">' + b.status + '</span></span></div>'; });
      rs.forEach(function (r) { var e = find(s.events, r.eventId); h += '<div class="item"><span>' + esc(e ? e.name : '') + '</span><span>' + r.cost + ' CR &middot; <span class="pill won">booked</span></span></div>'; });
      h += '</div></div>';
    }
    h += '<form class="card" id="pwform"><div class="label gold">Change password</div><div class="field"><label>New password</label><input type="password" id="newpw" minlength="6" required></div><button class="btn" type="submit">Update password</button><div class="msg ok" id="pwmsg"></div></form>';
    root.innerHTML = h;
    $('pwform').addEventListener('submit', function (e) {
      e.preventDefault();
      var st = load(), uu = currentUser(st); uu.password = $('newpw').value; save(st);
      $('newpw').value = ''; $('pwmsg').textContent = 'Password updated.';
    });
  }

  /* ---------- admin ---------- */
  function adminPage() {
    var root = $('content'), note = '';
    function draw() {
      var s = load(), u = currentUser(s);
      if (!u || u.role !== 'admin') { root.innerHTML = '<div class="card">This page is for organizers. <a class="red" href="login.html"><b>Admin login &#8599;</b></a></div>'; return; }
      var h = '<div class="eyebrow">Organizer control room</div><h1 class="title">Admin <span class="red">panel.</span></h1>';
      if (note) h += '<p class="msg ok" style="margin:-8px 0 16px">' + esc(note) + '</p>';
      h += '<a class="btn small" href="forex-admin.html" style="margin-bottom:18px">Foreign X Change controls &#8599;</a>';

      h += '<form class="card" id="f-del"><h2 style="margin-bottom:18px">Create a delegation</h2><div class="field"><label>Team name</label><input id="d-name" required></div><div class="field"><label>Campus</label><input id="d-campus" placeholder="OLNC, OLDC or other" required></div><button class="btn" type="submit">Create delegation &middot; 1000 CR</button></form>';

      h += '<form class="card" id="f-user"><h2 style="margin-bottom:18px">Issue portal access</h2><div class="field"><label>Email</label><input type="email" id="u-email" required></div><div class="field"><label>Temporary password</label><input id="u-pw" minlength="6" required></div><div class="field"><label>Access</label><select id="u-role"><option value="delegate">Delegate</option><option value="admin">Admin</option></select></div><div class="field"><label>Delegation</label><select id="u-del"><option value="">No delegation (admin)</option>' + s.delegations.map(function (d) { return '<option value="' + d.id + '">' + esc(d.name) + '</option>'; }).join('') + '</select></div><button class="btn" type="submit">Issue access</button></form>';

      h += '<div class="card"><h2 style="margin-bottom:18px">Delegations &amp; profiles</h2>';
      s.delegations.forEach(function (d) {
        h += '<form class="f-prof" data-id="' + d.id + '" style="padding-bottom:22px;margin-bottom:22px;border-bottom:1px solid var(--line)"><div class="two"><div class="field"><label>Delegation</label><input name="name" value="' + esc(d.name) + '"></div><div class="field"><label>Campus</label><input name="campus" value="' + esc(d.campus) + '"></div><div class="field"><label>Balance (CR)</label><input name="balance" type="number" value="' + d.balance + '"></div>';
        ROLES.forEach(function (r) { h += '<div class="field"><label>' + r[1] + '</label><input name="' + r[0] + '" value="' + esc(d.members[r[0]]) + '"></div>'; });
        h += '<div class="field"><label>Head Delegate</label><select name="head">' + ROLES.map(function (r) { return '<option value="' + r[0] + '"' + (d.head === r[0] ? ' selected' : '') + '>' + r[1] + '</option>'; }).join('') + '</select></div></div><button class="btn" type="submit" style="width:calc(50% - 8px)">Save profile</button></form>';
      });
      h += '</div>';

      h += '<div class="card"><h2 style="margin-bottom:8px">Event controls</h2><div class="list">';
      s.events.forEach(function (e) {
        var tl = e.status === 'open' ? 'Pause' : e.status === 'paused' ? 'Resume' : 'Open';
        h += '<div class="item"><div><b>' + esc(e.name) + '</b><small>' + e.status + ' &middot; ' + plural(e.places) + '</small></div><div style="display:flex;gap:8px"><button class="btn small ghost" data-act="toggle" data-id="' + e.id + '">' + tl + '</button><button class="btn small ghost" data-act="settle" data-id="' + e.id + '"' + (e.status === 'closed' ? ' disabled' : '') + '>Close &amp; settle</button></div></div>';
      });
      h += '</div></div>';

      var act = s.bids.map(function (b) { return { t: b.time, d: b.delegationId, e: b.eventId, a: b.amount, st: b.status }; })
        .concat(s.reservations.map(function (r) { return { t: r.time, d: r.delegationId, e: r.eventId, a: r.cost, st: 'won' }; }))
        .sort(function (a, b) { return b.t - a.t; });
      h += '<div class="card"><h2 style="margin-bottom:8px">All activity</h2><div class="list">' + (act.length ? act.map(function (x) { var d = find(s.delegations, x.d), e = find(s.events, x.e); return '<div class="item"><span>' + esc(d ? d.name : '?') + ' &middot; ' + esc(e ? e.name : '?') + '</span><b>' + x.a + ' CR &middot; ' + x.st + '</b></div>'; }).join('') : '<div class="item"><span>No activity yet.</span></div>') + '</div></div>';

      h += '<div class="card"><h2 style="margin-bottom:8px">Accounts</h2><div class="list">' + s.users.map(function (x) { var d = x.delegationId ? find(s.delegations, x.delegationId) : null; return '<div class="item"><span>' + esc(x.email) + '<small>' + x.role + (d ? ' &middot; ' + esc(d.name) : '') + '</small></span></div>'; }).join('') + '</div></div>';
      h += '<button class="btn dark small" id="reset">Reset all data</button>';
      root.innerHTML = h;

      $('f-del').addEventListener('submit', function (e) {
        e.preventDefault();
        var st = load();
        st.delegations.push({ id: uid(), name: $('d-name').value.trim(), campus: $('d-campus').value.trim(), balance: 1000, members: { cw: '', vg: '', tw: '', sp: '' }, head: 'cw' });
        save(st); note = 'Delegation created with 1000 CR.'; draw();
      });
      $('f-user').addEventListener('submit', function (e) {
        e.preventDefault();
        var st = load(), em = $('u-email').value.trim().toLowerCase(), role = $('u-role').value, did = $('u-del').value || null;
        if (st.users.some(function (x) { return x.email.toLowerCase() === em; })) { note = 'That email already has access.'; return draw(); }
        if (role === 'delegate' && !did) { note = 'Choose a delegation for a delegate account.'; return draw(); }
        st.users.push({ email: em, password: $('u-pw').value, role: role, delegationId: role === 'admin' ? null : did });
        save(st); note = 'Access issued to ' + em + '.'; draw();
      });
      Array.prototype.forEach.call(root.querySelectorAll('.f-prof'), function (f) {
        f.addEventListener('submit', function (e) {
          e.preventDefault();
          var st = load(), d = find(st.delegations, f.getAttribute('data-id')), g = function (n) { return f.elements[n].value; };
          d.name = g('name'); d.campus = g('campus'); d.balance = Math.max(0, Math.floor(Number(g('balance')) || 0));
          ROLES.forEach(function (r) { d.members[r[0]] = g(r[0]); }); d.head = g('head');
          save(st); note = 'Profile saved.'; draw();
        });
      });
      Array.prototype.forEach.call(root.querySelectorAll('[data-act]'), function (b) {
        b.addEventListener('click', function () {
          var st = load(), ev = find(st.events, b.getAttribute('data-id'));
          if (b.getAttribute('data-act') === 'toggle') { ev.status = ev.status === 'open' ? 'paused' : 'open'; note = ev.name + ' is now ' + ev.status + '.'; }
          else if (confirm('Close and settle "' + ev.name + '"? Winning bids will be deducted.')) { settle(st, ev.id); note = ev.name + ' closed and settled.'; }
          else return;
          save(st); draw();
        });
      });
      $('reset').addEventListener('click', function () {
        if (confirm('Erase ALL delegations, accounts, bids and bookings and restore the demo data?')) { save(seed()); setSession(null); location.href = 'login.html'; }
      });
    }
    draw();
  }

  window.IGNITE = { seed: seed, settle: settle, load: load, save: save, currentUser: currentUser, esc: esc, find: find, uid: uid };
  if (typeof document === 'undefined') return;
  document.addEventListener('DOMContentLoaded', function () {
    var p = document.body.getAttribute('data-page');
    renderChrome(p);
    if (p === 'auction') eventPage('industry');
    else if (p === 'rooms') eventPage('room');
    else if (p === 'login') loginPage();
    else if (p === 'profile') profilePage();
    else if (p === 'admin') adminPage();
  });
})();
