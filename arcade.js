/* Speelkamer: floating suits, Vang die Koeksisters, and Die Groot Debat. */
(() => {
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = id => document.getElementById(id);
  const store = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const rand = (a, b) => a + Math.random() * (b - a);

  // ---------- floating suits in the hero ----------
  const fl = $('floaters'), glyphs = ['♠', '♥', '♣', '♦', '✦', '♠', '♥', '♦'], items = [];
  for (let i = 0; i < 22; i++) {
    const s = document.createElement('span'); s.textContent = glyphs[i % glyphs.length]; if (i % 4 === 1) s.className = 'hot';
    const z = rand(0.3, 1.3); s.style.fontSize = Math.round(30 + z * 70) + 'px'; s.style.left = rand(0, 96) + '%'; s.style.top = rand(4, 90) + '%';
    fl.appendChild(s); items.push({ s, z, ph: rand(0, 6.28), sp: rand(.2, .6) });
  }
  let mx = 0, my = 0; addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });
  const floatLoop = t => {
    for (const it of items) it.s.style.transform = `translate(${-mx * 60 * it.z + Math.sin(t / 1000 * it.sp + it.ph) * 12}px, ${-my * 40 * it.z + Math.cos(t / 1300 * it.sp + it.ph) * 14}px) rotate(${Math.sin(t / 2000 + it.ph) * 14}deg)`;
    if (scrollY < innerHeight * 1.2) requestAnimationFrame(floatLoop); else floatOn = false;
  };
  let floatOn = false; const kickFloat = () => { if (!REDUCED && !floatOn) { floatOn = true; requestAnimationFrame(floatLoop); } };
  kickFloat(); addEventListener('scroll', () => { if (scrollY < innerHeight) kickFloat(); }, { passive: true });

  // ---------- Vang die Koeksisters ----------
  const cv = $('catchCanvas'), cx = cv.getContext('2d'), ov = $('catchOverlay');
  let W = 0, H = 0, dpr = 1, bg = null, run = false, paused = false, last = 0;
  let tray, things, sparks, floats, score, lives, spawnT, elapsed, best = store.get('dc_catch_best', 0), keys = {};
  $('cBest').textContent = best;
  function size() {
    const r = cv.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    bg = document.createElement('canvas'); bg.width = cv.width; bg.height = cv.height; const b = bg.getContext('2d'); b.scale(dpr, dpr);
    const g = b.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1b1230'); g.addColorStop(.55, '#6b2f3a'); g.addColorStop(.85, '#e0703f'); g.addColorStop(1, '#f2a65a'); b.fillStyle = g; b.fillRect(0, 0, W, H);
    const sg = b.createRadialGradient(W * .7, H * .78, 0, W * .7, H * .78, H * .35); sg.addColorStop(0, 'rgba(255,214,150,.95)'); sg.addColorStop(.25, 'rgba(255,150,80,.5)'); sg.addColorStop(1, 'rgba(255,120,60,0)');
    b.fillStyle = sg; b.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) { b.fillStyle = `rgba(255,255,255,${rand(.15, .6)})`; b.beginPath(); b.arc(rand(0, W), rand(0, H * .45), rand(.4, 1.3), 0, 6.28); b.fill(); }
    // Helderberg silhouette
    b.fillStyle = '#2a1520'; b.beginPath(); b.moveTo(0, H * .86);
    const pts = [[0, .84], [.12, .8], [.22, .74], [.3, .7], [.36, .62], [.42, .6], [.48, .63], [.55, .7], [.66, .74], [.78, .78], [.9, .8], [1, .83]];
    pts.forEach(([x, y]) => b.lineTo(x * W, y * H)); b.lineTo(W, H); b.lineTo(0, H); b.fill();
    b.fillStyle = '#160b10'; b.beginPath(); b.moveTo(0, H * .92); for (let x = 0; x <= 1.001; x += .05) b.lineTo(x * W, H * (.9 + Math.sin(x * 9) * .012)); b.lineTo(W, H); b.lineTo(0, H); b.fill();
    if (!run) drawFrame();
  }
  function reset() {
    tray = { x: W / 2, tx: W / 2, w: Math.max(74, Math.min(150, W * .17)), y: H - Math.max(34, H * .07) };
    things = []; sparks = []; floats = []; score = 0; lives = 3; spawnT = .6; elapsed = 0; hud();
  }
  function hud() { $('cScore').textContent = score; $('cBest').textContent = best; $('cLives').textContent = '♥'.repeat(Math.max(0, lives)) + '♡'.repeat(3 - Math.max(0, lives)); }
  function spawn() {
    const lvl = Math.min(1, elapsed / 70), r = Math.max(18, Math.min(30, W * .032));
    const roll = Math.random(), type = roll < .1 + lvl * .14 ? 'f' : roll < .18 + lvl * .14 ? 'm' : 'k';
    things.push({ type, x: rand(r * 1.5, W - r * 1.5), y: -r * 2, r, vy: (H * .32 + H * .5 * lvl) * rand(.85, 1.2) * (type === 'f' ? .8 : 1), a: rand(0, 6.28), va: rand(-2, 2), ph: rand(0, 6.28) });
  }
  function drawKoek(c, r) {
    // three syrupy strands plaited together, pinched at both ends
    const cols = ['#b8661c', '#d98a2b', '#f0b04a'];
    for (let k = 0; k < 3; k++) {
      c.beginPath();
      for (let n = 0; n <= 24; n++) { const t = n / 24, y = -r + t * 2 * r, pinch = Math.sin(t * Math.PI); const x = Math.sin(t * Math.PI * 3 + k * 2.094) * r * .38 * pinch; n ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.strokeStyle = cols[k]; c.lineWidth = r * .42; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
    }
    c.beginPath(); for (let n = 2; n <= 22; n++) { const t = n / 24, y = -r + t * 2 * r, x = Math.sin(t * Math.PI * 3 + 4.19) * r * .38 * Math.sin(t * Math.PI) - r * .06; n > 2 ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.strokeStyle = 'rgba(255,236,180,.7)'; c.lineWidth = r * .1; c.stroke();
  }
  function drawMelk(c, r) {
    c.fillStyle = '#c98b3c'; c.beginPath(); c.moveTo(-r, r * .7); c.lineTo(r, r * .7); c.lineTo(0, -r); c.closePath(); c.fill();
    c.fillStyle = '#fbe7b8'; c.beginPath(); c.moveTo(-r * .78, r * .5); c.lineTo(r * .78, r * .5); c.lineTo(0, -r * .7); c.closePath(); c.fill();
    c.fillStyle = '#9a5a26'; for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(Math.sin(i * 2.3) * r * .35, r * .15 - (i % 3) * r * .22, 1.6, 0, 6.28); c.fill(); }
    c.fillStyle = 'rgba(255,240,160,.9)'; c.font = `500 ${r * .7}px "JetBrains Mono", monospace`; c.textAlign = 'center'; c.fillText('+5', 0, -r * 1.15);
  }
  function drawFly(c, r, t) {
    const fl = Math.sin(t * 40) * .5 + .5;
    c.fillStyle = `rgba(220,235,255,${.35 + fl * .3})`; c.beginPath(); c.ellipse(-r * .45, -r * .35, r * .55, r * .25 * (0.4 + fl), -.6, 0, 6.28); c.ellipse(r * .45, -r * .35, r * .55, r * .25 * (0.4 + fl), .6, 0, 6.28); c.fill();
    c.fillStyle = '#141414'; c.beginPath(); c.ellipse(0, 0, r * .42, r * .55, 0, 0, 6.28); c.fill();
    c.fillStyle = '#b3261e'; c.beginPath(); c.arc(-r * .18, -r * .42, r * .14, 0, 6.28); c.arc(r * .18, -r * .42, r * .14, 0, 6.28); c.fill();
  }
  function drawFrame(t = 0) {
    cx.setTransform(dpr, 0, 0, dpr, 0, 0); if (bg) cx.drawImage(bg, 0, 0, W, H);
    if (!tray) return;
    for (const o of things) { cx.save(); cx.translate(o.x, o.y); if (o.type !== 'f') cx.rotate(o.a); o.type === 'k' ? drawKoek(cx, o.r) : o.type === 'm' ? drawMelk(cx, o.r) : drawFly(cx, o.r, t); cx.restore(); }
    for (const p of sparks) { cx.globalAlpha = Math.max(0, p.l); cx.fillStyle = p.c; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.28); cx.fill(); } cx.globalAlpha = 1;
    // tray: enamel plate with doily
    const { x, y, w } = tray; cx.fillStyle = 'rgba(0,0,0,.35)'; cx.beginPath(); cx.ellipse(x, y + 12, w * .52, 7, 0, 0, 6.28); cx.fill();
    cx.fillStyle = '#f4ece0'; cx.beginPath(); cx.ellipse(x, y, w * .5, 11, 0, 0, 6.28); cx.fill();
    cx.strokeStyle = '#2f5d8a'; cx.lineWidth = 3; cx.beginPath(); cx.ellipse(x, y, w * .5 - 2, 9, 0, 0, 6.28); cx.stroke();
    cx.fillStyle = 'rgba(255,107,61,.0)';
    for (const f of floats) { cx.globalAlpha = Math.max(0, f.l); cx.fillStyle = f.c; cx.font = `italic 500 ${f.s}px Fraunces, serif`; cx.textAlign = 'center'; cx.fillText(f.t, f.x, f.y); } cx.globalAlpha = 1;
  }
  function burst(x, y, col, n = 12) { for (let i = 0; i < n; i++) sparks.push({ x, y, vx: rand(-120, 120), vy: rand(-220, -40), r: rand(1.2, 3), l: 1, c: col }); }
  function float(t, x, y, c) { floats.push({ t, x, y, c, l: 1, s: 22 }); }
  function step(dt, t) {
    elapsed += dt; spawnT -= dt;
    if (spawnT <= 0) { spawn(); spawnT = Math.max(.32, .95 - elapsed * .009) * rand(.7, 1.2); }
    const sp = Math.max(320, W * 1.1);
    if (keys.ArrowLeft || keys.a) tray.tx -= sp * dt; if (keys.ArrowRight || keys.d) tray.tx += sp * dt;
    tray.tx = Math.max(tray.w / 2, Math.min(W - tray.w / 2, tray.tx)); tray.x += (tray.tx - tray.x) * Math.min(1, dt * 18);
    for (const o of things) {
      o.y += o.vy * dt; o.a += o.va * dt;
      if (o.type === 'f') o.x += Math.sin(t / 220 + o.ph) * 90 * dt;
      if (!o.dead && o.y + o.r * .5 >= tray.y - 8 && o.y - o.r < tray.y + 6 && Math.abs(o.x - tray.x) < tray.w * .5 + o.r * .3) {
        o.dead = true;
        if (o.type === 'k') { score++; burst(o.x, tray.y - 6, '#f6c35b'); float('+1', o.x, tray.y - 24, '#ffe3a8'); }
        else if (o.type === 'm') { score += 5; burst(o.x, tray.y - 6, '#fbe7b8', 22); float('+5 melktert!', o.x, tray.y - 26, '#fff1c9'); }
        else { lives--; burst(o.x, tray.y - 6, '#555', 10); float('Sies! A fly', o.x, tray.y - 26, '#ff8a6b'); }
        hud();
      }
      if (!o.dead && o.y - o.r > H) { o.dead = true; if (o.type === 'k') { lives--; float('Oeps!', o.x, H - 30, '#ff8a6b'); hud(); } }
    }
    things = things.filter(o => !o.dead);
    for (const p of sparks) { p.vy += 500 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.l -= dt * 1.4; } sparks = sparks.filter(p => p.l > 0);
    for (const f of floats) { f.y -= 40 * dt; f.l -= dt * 1.1; } floats = floats.filter(f => f.l > 0);
    if (lives <= 0) over();
  }
  function loop(t) {
    if (!run) return;
    const dt = Math.min(.05, (t - last) / 1000); last = t;
    if (!paused) { step(dt, t); drawFrame(t); }
    requestAnimationFrame(loop);
  }
  function startGame() { size(); reset(); ov.hidden = true; run = true; paused = false; last = performance.now(); requestAnimationFrame(loop); cv.focus({ preventScroll: true }); }
  function over() {
    run = false; if (score > best) { best = score; store.set('dc_catch_best', best); }
    hud(); drawFrame();
    $('catchTitle').textContent = score >= 50 ? 'Tannie would be proud!' : score >= 20 ? 'Lekker gevang!' : 'Klaar gespeel';
    $('catchMsg').textContent = `You caught ${score} point${score === 1 ? '' : 's'} of koeksisters. Best on this device: ${best}.`;
    $('catchStart').textContent = 'Weer · Play again'; ov.hidden = false;
  }
  $('catchStart').addEventListener('click', startGame);
  cv.tabIndex = 0;
  const movePtr = e => { if (!tray) return; const r = cv.getBoundingClientRect(); tray.tx = e.clientX - r.left; };
  cv.addEventListener('pointermove', movePtr); cv.addEventListener('pointerdown', movePtr);
  addEventListener('keydown', e => { if (!run) return; if (['ArrowLeft', 'ArrowRight'].includes(e.key) && document.activeElement === cv) e.preventDefault(); keys[e.key] = true; });
  addEventListener('keyup', e => { keys[e.key] = false; });
  new IntersectionObserver(es => es.forEach(e => { paused = !e.isIntersecting; if (e.isIntersecting) last = performance.now(); }), { threshold: .2 }).observe(cv);
  document.addEventListener('visibilitychange', () => { paused = document.hidden; last = performance.now(); });
  let lw = 0; new ResizeObserver(() => { const w = cv.clientWidth; if (Math.abs(w - lw) > 2) { lw = w; size(); if (run && tray) { tray.y = H - Math.max(34, H * .07); tray.w = Math.max(74, Math.min(150, W * .17)); } } }).observe(cv);
  size(); reset(); things = [{ type: 'k', x: W * .3, y: H * .3, r: 22, a: .4 }, { type: 'm', x: W * .55, y: H * .45, r: 22, a: -.3 }, { type: 'f', x: W * .75, y: H * .25, r: 20, a: 0 }, { type: 'k', x: W * .15, y: H * .55, r: 20, a: 1.2 }];
  drawFrame(0);

  // ---------- Die Groot Debat (A/B) ----------
  const Q = [
    { id: 'koek', a: 'Koeksister', da: 'Plaited, crisp, dripping with syrup', b: 'Koesister', db: 'Spiced Cape Malay, rolled in coconut' },
    { id: 'beach', a: 'Strand', da: 'The long stretch, the promenade, the crowds', b: "Gordon's Bay", db: 'Harbour, Bikini Beach, the big GB on the hill' },
    { id: 'biltong', a: 'Biltong', da: 'Wet or dry, sliced thin', b: 'Droëwors', db: 'Snap it, share it, hide it' },
    { id: 'braai', a: 'Hout', da: 'Wood fire. Patience is part of the flavour', b: 'Houtskool', db: 'Charcoal. Fast, hot, efficient' },
    { id: 'wine', a: 'Lourensford', da: 'Big lawns, the market, mountain views', b: 'Vergelegen', db: 'Old camphor trees and the octagonal garden' },
    { id: 'market', a: 'Weekly market', da: 'Small, every Saturday, in Somerset West', b: 'Monthly festival', db: 'One big, loud, brilliant day' }
  ];
  let qi = 0, votes = store.get('dc_votes', {});
  const vA = $('voteA'), vB = $('voteB');
  function showQ() {
    const q = Q[qi], t = votes[q.id] || { a: 0, b: 0 }, n = t.a + t.b;
    $('optA').textContent = q.a; $('descA').textContent = q.da; $('optB').textContent = q.b; $('descB').textContent = q.db;
    const pa = n ? Math.round(t.a / n * 100) : 0, pb = n ? 100 - pa : 0;
    $('fillA').style.width = (n ? pa : 0) + '%'; $('fillB').style.width = (n ? pb : 0) + '%';
    $('pctA').textContent = n ? pa + '%' : '–'; $('pctB').textContent = n ? pb + '%' : '–';
    $('cntA').textContent = `${q.a} · ${t.a} vote${t.a === 1 ? '' : 's'}`; $('cntB').textContent = `${q.b} · ${t.b} vote${t.b === 1 ? '' : 's'}`;
    $('qIdx').textContent = `${qi + 1} / ${Q.length}`;
    vA.setAttribute('aria-label', `Vote for ${q.a}: ${q.da}`); vB.setAttribute('aria-label', `Vote for ${q.b}: ${q.db}`);
  }
  function vote(side, el) {
    const q = Q[qi]; votes[q.id] = votes[q.id] || { a: 0, b: 0 }; votes[q.id][side]++; store.set('dc_votes', votes);
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); showQ();
  }
  vA.addEventListener('click', () => vote('a', vA)); vB.addEventListener('click', () => vote('b', vB));
  $('qNext').addEventListener('click', () => { qi = (qi + 1) % Q.length; showQ(); });
  $('qPrev').addEventListener('click', () => { qi = (qi - 1 + Q.length) % Q.length; showQ(); });
  $('qReset').addEventListener('click', () => { delete votes[Q[qi].id]; store.set('dc_votes', votes); showQ(); });
  showQ();
})();
