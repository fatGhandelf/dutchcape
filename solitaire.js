/* Storybook Solitaire: Klondike for the web. Card art: storybook faces drawn by Sam (public-domain characters). */
(() => {
  const SU = ['h', 's', 'c', 'd'], SYM = ['♥', '♠', '♣', '♦'], RK = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const WORLD = ['Wonderland', 'Gothic', 'Hundred Acre', 'Oz & Sherwood'];
  const FACE = { 0: 'A', 10: 'J', 11: 'Q', 12: 'K' };
  const NAMES = [['White Rabbit', 'Cheshire Cat', 'Alice', 'The Hatter'], ['Invisible Man', 'Headless Horseman', 'The Creature', 'Count Dracula'], ['Eeyore', 'Tigger', 'Kanga', 'Pooh'], ['Tinker Bell', 'Peter Pan', 'Dorothy', 'Robin Hood']];
  const su = id => (id / 13) | 0, rk = id => id % 13, red = id => su(id) === 0 || su(id) === 3;
  const board = document.getElementById('board'); if (!board) return;
  const $ = id => document.getElementById(id);
  const store = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let P = [], undo = [], drawN = store.get('dc_sol_draw', 3), moves = 0, time = 0, started = false, won = false, timer = null;
  let L = {}; const els = [], slots = [];

  // ---- build DOM ----
  for (let p = 0; p < 13; p++) {
    const s = document.createElement('div'); s.className = 'slot' + (p === 0 ? ' stock' : ''); s.dataset.pile = p;
    if (p >= 2 && p <= 5) s.textContent = SYM[p - 2];
    if (p === 1) s.style.visibility = 'hidden';
    board.appendChild(s); slots.push(s);
  }
  for (let id = 0; id < 52; id++) {
    const el = document.createElement('div'); el.className = `card s${su(id)}` + (red(id) ? ' red' : ''); el.dataset.id = id;
    const r = rk(id), name = FACE[r] !== undefined ? NAMES[su(id)][[0, 10, 11, 12].indexOf(r)] : null;
    el.setAttribute('aria-label', `${RK[r]} of ${['hearts', 'spades', 'clubs', 'diamonds'][su(id)]}${name ? ', ' + name : ''}`);
    const front = FACE[r] !== undefined
      ? `<img src="cards/${FACE[r]}${SU[su(id)]}.png" alt="" draggable="false" loading="eager">`
      : `<span class="rk">${RK[r]}</span><span class="st">${SYM[su(id)]}</span><span class="pane"><span class="big">${SYM[su(id)]}</span><span class="w">${WORLD[su(id)]}</span></span>`;
    el.innerHTML = `<div class="in"><div class="f">${front}</div><div class="bk"></div></div>`;
    board.appendChild(el); els.push(el);
  }

  // ---- game state ----
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function deal() {
    P = Array.from({ length: 13 }, () => []); const d = shuffle([...Array(52).keys()]);
    for (let c = 0; c < 7; c++) for (let k = 0; k <= c; k++) P[6 + c].push({ id: d.pop(), up: k === c });
    while (d.length) P[0].push({ id: d.pop(), up: false });
    undo = []; moves = 0; time = 0; started = false; won = false; $('solWin').hidden = true; tick(); render();
  }
  const snap = () => { undo.push(JSON.stringify({ P, moves })); if (undo.length > 300) undo.shift(); };
  const top = p => P[p][P[p].length - 1];
  const canFound = (id, f) => { const t = top(f); return t ? su(t.id) === su(id) && rk(id) === rk(t.id) + 1 : rk(id) === 0; };
  const canTab = (id, p) => { const t = top(p); return t ? t.up && red(t.id) !== red(id) && rk(id) === rk(t.id) - 1 : rk(id) === 12; };
  function legal(from, idx, to) {
    if (to === from) return false; const n = P[from].length - idx, id = P[from][idx].id;
    if (to >= 2 && to <= 5) return n === 1 && canFound(id, to);
    if (to >= 6) return canTab(id, to);
    return false;
  }
  function doMove(from, idx, to) {
    snap(); const mv = P[from].splice(idx); P[to].push(...mv);
    if (from >= 6 && P[from].length && !top(from).up) top(from).up = true;
    moves++; start(); render(); checkWin();
  }
  function stockTap() {
    if (won) return; snap(); start();
    if (!P[0].length) { while (P[1].length) { const c = P[1].pop(); c.up = false; P[0].push(c); } }
    else for (let k = 0; k < drawN && P[0].length; k++) { const c = P[0].pop(); c.up = true; P[1].push(c); }
    moves++; render();
  }
  function autoTarget(from, idx) {
    const id = P[from][idx].id, single = idx === P[from].length - 1;
    if (single) for (let f = 2; f <= 5; f++) if (canFound(id, f)) return doMove(from, idx, f), true;
    for (let p = 6; p <= 12; p++) if (p !== from && P[p].length && canTab(id, p)) return doMove(from, idx, p), true;
    if (!(from >= 6 && idx === 0)) for (let p = 6; p <= 12; p++) if (p !== from && !P[p].length && canTab(id, p)) return doMove(from, idx, p), true;
    return false;
  }
  const canAuto = () => !won && !P[0].length && !P[1].length && P.slice(6).some(p => p.length) && P.slice(6).every(p => p.every(c => c.up));
  function autoRun() {
    if (won) return;
    for (let p = 1; p <= 12; p++) { if (p >= 2 && p <= 5) continue; const t = top(p); if (!t) continue;
      for (let f = 2; f <= 5; f++) if (canFound(t.id, f)) { doMove(p, P[p].length - 1, f); return setTimeout(autoRun, REDUCED ? 0 : 90); } }
  }
  function checkWin() {
    if (won || P.slice(2, 6).reduce((a, p) => a + p.length, 0) !== 52) return;
    won = true; clearInterval(timer); timer = null;
    const wins = store.get('dc_sol_wins', 0) + 1; store.set('dc_sol_wins', wins);
    const best = store.get('dc_sol_best', 0); if (!best || time < best) store.set('dc_sol_best', time);
    $('solWinStats').textContent = `${fmt(time)} · ${moves} moves · Wins ${wins}`; $('solWin').hidden = false; stats(); confetti();
  }
  function start() { if (started) return; started = true; timer = setInterval(() => { time++; tick(); }, 1000); }
  const fmt = s => `${String((s / 60) | 0).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  function tick() { $('solTime').textContent = fmt(time); $('solMoves').textContent = moves; }
  function stats() { $('solWins').textContent = store.get('dc_sol_wins', 0); const b = store.get('dc_sol_best', 0); $('solBest').textContent = b ? fmt(b) : '–'; }
  function confetti() {
    if (REDUCED) return; const cols = ['#f2b544', '#ff6b8a', '#7fd1ff', '#9be07a', '#ff6b3d'];
    for (let i = 0; i < 90; i++) { const c = document.createElement('i'); c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw'; c.style.background = cols[i % 5]; c.style.animationDuration = (2 + Math.random() * 2.5) + 's'; c.style.animationDelay = Math.random() * .8 + 's';
      document.body.appendChild(c); setTimeout(() => c.remove(), 5500); }
  }

  // ---- layout / render ----
  function layout() {
    const W = board.clientWidth, gap = Math.max(4, Math.round(W * 0.012)), cw = Math.min(110, Math.floor((W - gap * 6) / 7)), ch = Math.round(cw * 1.42);
    const span = cw * 7 + gap * 6, x0 = Math.max(0, (W - span) / 2);
    L = { W, gap, cw, ch, x0, tabY: ch + gap * 3, dn: Math.round(ch * 0.11), un: Math.round(ch * (cw < 70 ? 0.26 : 0.27)) };
    board.style.setProperty('--cw', cw + 'px'); board.style.setProperty('--ch', ch + 'px');
  }
  const colX = c => L.x0 + c * (L.cw + L.gap);
  function pos(p, i) {
    if (p === 0) return [colX(0), 0];
    if (p === 1) { const n = P[1].length, vis = Math.min(drawN === 3 ? 3 : 1, n), k = i - (n - vis); return [colX(1) + (k > 0 ? k * L.cw * 0.3 : 0), 0]; }
    if (p <= 5) return [colX(p + 1), 0];
    let y = L.tabY; for (let k = 0; k < i; k++) y += P[p][k].up ? L.un : L.dn; return [colX(p - 6), y];
  }
  function render() {
    layout(); let maxY = L.tabY + L.ch;
    slots.forEach((s, p) => { const [x, y] = p >= 6 ? [colX(p - 6), L.tabY] : pos(p, 0);
      Object.assign(s.style, { left: x + 'px', top: y + 'px', width: L.cw + 'px', height: L.ch + 'px' }); });
    slots[0].classList.toggle('full', P[0].length > 0);
    for (let p = 0; p < 13; p++) P[p].forEach((c, i) => {
      const el = els[c.id], [x, y] = pos(p, i);
      if (!el.classList.contains('drag')) el.style.transform = `translate(${x}px,${y}px)`;
      el.style.zIndex = (p === 1 ? 100 : p >= 6 ? 200 : 50) + i;
      el.classList.toggle('up', c.up); el.dataset.pile = p; el.dataset.idx = i;
      el.tabIndex = c.up && (p >= 6 || i === P[p].length - 1) && p !== 0 ? 0 : -1;
      if (p === 1 && i < P[1].length - 3) el.style.visibility = 'hidden'; else el.style.visibility = '';
      if (p >= 6) maxY = Math.max(maxY, y + L.ch);
    });
    board.style.height = maxY + 8 + 'px';
    $('solAuto').hidden = !canAuto(); tick();
    $('solDraw').textContent = `Draw ${drawN}`; $('solDraw').setAttribute('aria-pressed', drawN === 1);
  }

  // ---- input ----
  let drag = null;
  board.addEventListener('pointerdown', e => {
    const el = e.target.closest('.card'), slot = e.target.closest('.slot');
    if (!el) { if (slot && slot.dataset.pile === '0') stockTap(); return; }
    const p = +el.dataset.pile, i = +el.dataset.idx;
    if (p === 0) { stockTap(); return; }
    const c = P[p][i]; if (!c || !c.up || won) return;
    if ((p === 1 || (p >= 2 && p <= 5)) && i !== P[p].length - 1) return;
    e.preventDefault();
    const r = board.getBoundingClientRect(), [x, y] = pos(p, i);
    drag = { p, i, sx: e.clientX, sy: e.clientY, ox: e.clientX - r.left - x, oy: e.clientY - r.top - y, moved: false, els: P[p].slice(i).map(c => els[c.id]), id: e.pointerId };
    try { el.setPointerCapture(e.pointerId); } catch (err) {}
  });
  board.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6) return;
    if (!drag.moved) { drag.moved = true; drag.els.forEach((el, k) => { el.classList.add('drag'); el.style.zIndex = 900 + k; }); }
    const r = board.getBoundingClientRect(), x = e.clientX - r.left - drag.ox, y = e.clientY - r.top - drag.oy;
    drag.els.forEach((el, k) => el.style.transform = `translate(${x}px,${y + k * L.un}px) rotate(${Math.max(-4, Math.min(4, (e.clientX - drag.sx) / 40))}deg)`);
    drag.x = x; drag.y = y;
  });
  const endDrag = e => {
    if (!drag || (e && e.pointerId !== drag.id)) return; const d = drag; drag = null;
    d.els.forEach(el => el.classList.remove('drag'));
    if (!d.moved) { if (!autoTarget(d.p, d.i)) { nudge(d.els[0]); } render(); return; }
    const cx = d.x + L.cw / 2, cy = d.y + L.ch / 2; let best = -1, bestD = 1e9;
    for (let to = 2; to <= 12; to++) {
      if (!legal(d.p, d.i, to)) continue;
      let tx, ty; if (to <= 5) [tx, ty] = pos(to, 0); else { const n = P[to].length; [tx, ty] = n ? pos(to, n - 1) : [colX(to - 6), L.tabY]; }
      const dist = Math.hypot(tx + L.cw / 2 - cx, ty + L.ch / 2 - cy);
      if (dist < bestD && Math.abs(tx + L.cw / 2 - cx) < L.cw * 1.1 && Math.abs(ty + L.ch / 2 - cy) < L.ch * 1.6) { best = to; bestD = dist; }
    }
    if (best > 0) doMove(d.p, d.i, best); else render();
  };
  board.addEventListener('pointerup', endDrag); board.addEventListener('pointercancel', e => { if (drag) { drag.moved = true; drag.x = -1e4; } endDrag(e); });
  function nudge(el) { if (REDUCED) return; el.animate([{ marginLeft: '0px' }, { marginLeft: '-5px' }, { marginLeft: '5px' }, { marginLeft: '0px' }], { duration: 260 }); }
  board.addEventListener('keydown', e => {
    const el = e.target.closest('.card'); if (!el || (e.key !== 'Enter' && e.key !== ' ')) return; e.preventDefault();
    const p = +el.dataset.pile, i = +el.dataset.idx; if (!autoTarget(p, i)) nudge(el);
    const n = board.querySelector('.card[tabindex="0"]'); if (document.activeElement === document.body && n) n.focus();
  });

  $('solNew').onclick = deal; $('solAgain').onclick = deal;
  $('solUndo').onclick = () => { if (!undo.length || won) return; const s = JSON.parse(undo.pop()); P = s.P; moves = s.moves + 1; render(); };
  $('solDraw').onclick = () => { drawN = drawN === 3 ? 1 : 3; store.set('dc_sol_draw', drawN); deal(); };
  $('solAuto').onclick = () => { $('solAuto').hidden = true; autoRun(); };
  let lw = 0; new ResizeObserver(() => { if (board.clientWidth !== lw) { lw = board.clientWidth; render(); } }).observe(board);
  document.addEventListener('visibilitychange', () => { if (document.hidden && timer) { clearInterval(timer); timer = null; started = false; } });
  stats(); deal();
})();
