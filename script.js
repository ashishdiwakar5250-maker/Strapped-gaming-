'use strict';
/* ===== STRAPPED GAMING - script.js ===== */
const CONTACT_EMAIL = 'strappedgaming@example.com'; // <-- change to your real email
const W = 360, H = 480;
const $ = (s, r = document) => r.querySelector(s);
const CATS = [['action','Action Games','⚔️'],['adventure','Adventure Games','🧭'],['racing','Racing Games','🏎️'],['puzzle','Puzzle Games','🧩'],['shooting','Shooting Games','🎯'],['arcade','Arcade Games','🕹️'],['sports','Sports Games','🏀']];
const catName = id => (CATS.find(c => c[0] === id) || [])[1];
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem('sg_' + k)) ?? d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('sg_' + k, JSON.stringify(v)); } catch (e) {} }
};
const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

/* ===== Input (touch, mouse, keyboard) ===== */
const KQ = [], K = {};
addEventListener('keydown', e => {
  if (location.hash.startsWith('#/game/') && (e.key.startsWith('Arrow') || e.key === ' ')) e.preventDefault();
  KQ.push(e.key); K[e.key] = 1;
});
addEventListener('keyup', e => delete K[e.key]);
function input(cv) {
  const p = { x: W / 2, y: H / 2, tap: null, down: false, used: false };
  const pos = e => { const r = cv.getBoundingClientRect(); p.x = (e.clientX - r.left) * W / r.width; p.y = (e.clientY - r.top) * H / r.height; p.used = true; };
  cv.addEventListener('pointerdown', e => { pos(e); p.down = true; p.tap = { x: p.x, y: p.y }; try { cv.setPointerCapture(e.pointerId); } catch (x) {} });
  cv.addEventListener('pointermove', pos);
  cv.addEventListener('pointerup', () => p.down = false);
  cv.addEventListener('pointercancel', () => p.down = false);
  return p;
}

/* ===== Game runner: handles start screen, loop, score, best score, game over ===== */
function run(game, cv) {
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d'), p = input(cv);
  let step, score = 0, state = 'ready', raf, last = performance.now(), overT = 0, drawn = false, stopped = false;
  let best = store.get('best_' + game.id, 0);
  const g = {
    add: n => { score += n; },
    end() { if (state !== 'play') return; state = 'over'; drawn = false; overT = performance.now(); if (score > best) { best = score; store.set('best_' + game.id, best); } },
    get score() { return score; }
  };
  const txt = (s, y, sz, col) => { c.fillStyle = col || '#fff'; c.font = '800 ' + sz + 'px system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillText(s, W / 2, y); };
  const wrap = (s, y) => { let line = ''; s.split(' ').forEach(w => { if ((line + w).length > 34) { txt(line, y, 15, '#9aa0c8'); y += 22; line = ''; } line += w + ' '; }); txt(line, y, 15, '#9aa0c8'); };
  function frame(t) {
    if (stopped) return;
    const dt = Math.min((t - last) / 16.67, 3); last = t;
    const go = p.tap || KQ.includes(' ') || KQ.includes('Enter');
    if (state === 'play') {
      c.fillStyle = '#0b0b1e'; c.fillRect(0, 0, W, H);
      step(c, p, g, dt);
      c.shadowBlur = 0; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillStyle = '#18c8ff'; c.font = '800 16px system-ui,sans-serif';
      c.fillText('SCORE ' + score, 10, 22); c.textAlign = 'right'; c.fillStyle = '#a855ff'; c.fillText('BEST ' + best, W - 10, 22);
    } else if (state === 'ready') {
      c.fillStyle = '#0b0b1e'; c.fillRect(0, 0, W, H);
      txt(game.e, 150, 64); txt(game.t.toUpperCase(), 210, 28, '#a855ff'); wrap(game.h, 250);
      txt('▶ TAP TO PLAY', 340, 26, '#22ff88'); if (best) txt('Best: ' + best, 380, 16, '#18c8ff');
      if (go) { score = 0; step = game.make(); state = 'play'; }
    } else {
      if (!drawn) {
        c.fillStyle = 'rgba(5,5,20,.82)'; c.fillRect(0, 0, W, H);
        txt(game.win || 'GAME OVER', 190, 36, '#ff2a55'); txt('Score: ' + score, 238, 24); txt('Best: ' + best, 270, 18, '#18c8ff'); txt('TAP TO PLAY AGAIN', 330, 20, '#22ff88');
        drawn = true;
      }
      if (go && t - overT > 500) { score = 0; step = game.make(); state = 'play'; }
    }
    p.tap = null; KQ.length = 0;
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return () => { stopped = true; cancelAnimationFrame(raf); };
}

/* ===== The 7 original games (one per category) ===== */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const GAMES = [
  { id: 'neon-ninja', t: 'Neon Ninja', c: 'action', e: '🥷', col: '#ff2a55', hot: 80, h: 'Enemies rush the center. Tap the LEFT or RIGHT side of the screen to slash them in time.',
    make() { let E = [], t = 0, fl = 0, fs = 1;
      return (c, p, g, dt) => {
        const cx = W / 2, cy = H / 2, sp = 1.3 + g.score * .03;
        t -= dt; if (t <= 0) { E.push({ s: Math.random() < .5 ? -1 : 1, d: 190 }); t = Math.max(24, 70 - g.score * 1.2); }
        const tapS = p.tap ? (p.tap.x < cx ? -1 : 1) : KQ.includes('ArrowLeft') ? -1 : KQ.includes('ArrowRight') ? 1 : 0;
        if (tapS) { fs = tapS; fl = 8; const k = E.filter(e => e.s === tapS && e.d < 90).sort((a, b) => a.d - b.d)[0]; if (k) { E.splice(E.indexOf(k), 1); g.add(1); } }
        E.forEach(e => { e.d -= sp * dt; if (e.d < 24) g.end(); });
        c.strokeStyle = '#7a2cff'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, cy + 20); c.lineTo(W, cy + 20); c.stroke();
        c.shadowBlur = 20; c.shadowColor = '#00e5ff'; c.fillStyle = '#00e5ff'; c.beginPath(); c.arc(cx, cy, 16, 0, 7); c.fill();
        c.shadowColor = '#ff2a55'; c.fillStyle = '#ff2a55'; E.forEach(e => c.fillRect(cx + e.s * e.d - 12, cy - 12, 24, 24));
        if (fl > 0) { fl -= dt; c.strokeStyle = '#fff'; c.lineWidth = 4; c.beginPath(); c.arc(cx, cy, 50, fs < 0 ? Math.PI * .6 : -Math.PI * .4, fs < 0 ? Math.PI * 1.4 : Math.PI * .4); c.stroke(); }
      }; } },
  { id: 'gem-quest', t: 'Gem Quest', c: 'adventure', e: '💎', col: '#22ff88', hot: 55, h: 'Collect every gem and dodge the ghost. Tap in the direction you want to move (or use arrow keys).',
    make() { const C = 9, R = 11, S = 40, oy = 20; let L = 1, wall, gems, pl, gh, gt = 0;
      const rnd = n => Math.random() * n | 0, can = (x, y) => x >= 0 && y >= 0 && x < C && y < R && !wall.has(x + ',' + y);
      function build() {
        wall = new Set(); for (let i = 0; i < C * R * .2; i++) { const x = rnd(C), y = rnd(R); if (x + y > 2 && x + y < C + R - 4) wall.add(x + ',' + y); }
        wall.delete((C - 1) + ',' + (R - 1));
        const seen = new Set(['0,0']), q = [[0, 0]];
        while (q.length) { const [a, b] = q.pop(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([i, j]) => { const x = a + i, y = b + j, k = x + ',' + y; if (can(x, y) && !seen.has(k)) { seen.add(k); q.push([x, y]); } }); }
        const free = [...seen].filter(k => k !== '0,0' && k !== (C - 1) + ',' + (R - 1)).sort(() => Math.random() - .5).slice(0, 5 + L);
        gems = free.map(k => { const [x, y] = k.split(',').map(Number); return { x, y }; });
        pl = { x: 0, y: 0 }; gh = { x: C - 1, y: R - 1 };
      }
      build();
      const DIR = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      return (c, p, g, dt) => {
        let d = null;
        if (p.tap) { const dx = p.tap.x - (pl.x * S + S / 2), dy = p.tap.y - (oy + pl.y * S + S / 2); d = Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]; }
        KQ.forEach(k => { if (DIR[k]) d = DIR[k]; });
        if (d && can(pl.x + d[0], pl.y + d[1])) { pl.x += d[0]; pl.y += d[1]; const i = gems.findIndex(q => q.x === pl.x && q.y === pl.y); if (i >= 0) { gems.splice(i, 1); g.add(10); } }
        if (!gems.length) { L++; g.add(25); build(); }
        gt -= dt;
        if (gt <= 0) { gt = Math.max(10, 28 - L * 2);
          const o = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([i, j]) => can(gh.x + i, gh.y + j)), dist = m => Math.abs(gh.x + m[0] - pl.x) + Math.abs(gh.y + m[1] - pl.y);
          if (o.length) { o.sort((a, b) => dist(a) - dist(b)); const m = Math.random() < .3 ? o[rnd(o.length)] : o[0]; gh.x += m[0]; gh.y += m[1]; } }
        if (gh.x === pl.x && gh.y === pl.y) g.end();
        c.fillStyle = '#2a1a5e'; wall.forEach(k => { const [x, y] = k.split(',').map(Number); c.fillRect(x * S + 2, oy + y * S + 2, S - 4, S - 4); });
        c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '26px system-ui';
        gems.forEach(q => c.fillText('💎', q.x * S + S / 2, oy + q.y * S + S / 2));
        c.fillText('🥷', pl.x * S + S / 2, oy + pl.y * S + S / 2); c.fillText('👻', gh.x * S + S / 2, oy + gh.y * S + S / 2);
      }; } },
  { id: 'neon-racer', t: 'Neon Racer', c: 'racing', e: '🏎️', col: '#18c8ff', hot: 95, h: 'Tap LEFT or RIGHT to change lanes and weave through traffic. Arrow keys work too.',
    make() { let lane = 1, x = 180, cars = [], t = 0, off = 0; const LX = [100, 180, 260], COL = ['#ff2a55', '#ffb020', '#a855ff'];
      return (c, p, g, dt) => {
        const sp = 4 + g.score * .12;
        if (p.tap) lane = clamp(lane + (p.tap.x < W / 2 ? -1 : 1), 0, 2);
        KQ.forEach(k => { if (k === 'ArrowLeft') lane = Math.max(0, lane - 1); if (k === 'ArrowRight') lane = Math.min(2, lane + 1); });
        x += (LX[lane] - x) * .25 * Math.min(dt, 1.5);
        t -= dt; if (t <= 0) { cars.push({ l: Math.random() * 3 | 0, y: -60 }); t = Math.max(28, 70 - g.score); }
        off = (off + sp * dt) % 80;
        c.fillStyle = '#15153a'; c.fillRect(50, 0, 260, H);
        c.fillStyle = '#18c8ff'; c.fillRect(46, 0, 4, H); c.fillRect(310, 0, 4, H);
        c.fillStyle = '#ffffff55'; for (let y = -80; y < H; y += 80) { c.fillRect(137, y + off, 4, 40); c.fillRect(219, y + off, 4, 40); }
        cars.forEach(o => { o.y += sp * dt; if (Math.abs(LX[o.l] - x) < 36 && Math.abs(o.y - 400) < 54) g.end(); });
        cars = cars.filter(o => { if (o.y > H + 60) { g.add(1); return false; } return true; });
        c.shadowBlur = 14;
        cars.forEach(o => { c.shadowColor = c.fillStyle = COL[o.l]; c.fillRect(LX[o.l] - 20, o.y - 28, 40, 56); });
        c.shadowColor = c.fillStyle = '#22ff88'; c.fillRect(x - 20, 372, 40, 56);
        c.fillStyle = '#07071a'; c.fillRect(x - 14, 380, 28, 12);
      }; } },
  { id: 'memory-flip', t: 'Memory Flip', c: 'puzzle', e: '🧩', col: '#a855ff', hot: 40, win: 'CLEARED!', h: 'Flip two cards at a time and match all 8 pairs. Fewer moves means a bigger bonus.',
    make() { const em = ['🍎', '🚀', '⚡', '👾', '🎮', '💎', '🔥', '🐉'];
      const cs = [...em, ...em].sort(() => Math.random() - .5).map(e => ({ e, o: 0, m: 0 })); let op = [], lock = 0, mv = 0, done = 0;
      const pos = i => [13 + (i % 4) * 86, 40 + (i / 4 | 0) * 106];
      return (c, p, g, dt) => {
        if (lock > 0) { lock -= dt; if (lock <= 0) { op.forEach(i => cs[i].o = 0); op = []; } }
        else if (p.tap) {
          cs.forEach((k, i) => { const [x, y] = pos(i); if (!k.o && !k.m && op.length < 2 && p.tap.x > x && p.tap.x < x + 76 && p.tap.y > y && p.tap.y < y + 96) { k.o = 1; op.push(i); } });
          if (op.length === 2) { mv++; const [a, b] = op;
            if (cs[a].e === cs[b].e) { cs[a].m = cs[b].m = 1; op = []; g.add(10); if (++done === 8) { g.add(Math.max(0, 60 - mv * 3)); g.end(); } } else lock = 35; }
        }
        c.textAlign = 'center'; c.textBaseline = 'middle';
        cs.forEach((k, i) => { const [x, y] = pos(i);
          c.fillStyle = k.m ? '#0c3a2a' : k.o ? '#e8e8ff' : '#2a1a5e'; c.strokeStyle = k.m ? '#22ff88' : '#a855ff'; c.lineWidth = 2;
          c.beginPath(); c.roundRect ? c.roundRect(x, y, 76, 96, 10) : c.rect(x, y, 76, 96); c.fill(); c.stroke();
          c.font = '36px system-ui'; c.fillStyle = '#a855ff'; c.fillText(k.o || k.m ? k.e : '?', x + 38, y + 50); });
        c.font = '700 13px system-ui'; c.fillStyle = '#9aa0c8'; c.fillText('Moves: ' + mv, W / 2, H - 14);
      }; } },
  { id: 'star-blaster', t: 'Star Blaster', c: 'shooting', e: '🚀', col: '#ff7a00', hot: 85, h: 'Drag your finger to steer. Your ship fires automatically. Do not let enemies reach the bottom!',
    make() { let x = 180, B = [], E = [], f = 0, t = 0, lives = 3;
      return (c, p, g, dt) => {
        if (p.used) x += (p.x - x) * .3 * Math.min(dt, 1.5);
        if (K.ArrowLeft) x -= 6 * dt; if (K.ArrowRight) x += 6 * dt; x = clamp(x, 20, W - 20);
        f -= dt; if (f <= 0) { B.push({ x, y: 410 }); f = 12; }
        t -= dt; if (t <= 0) { E.push({ x: 20 + Math.random() * (W - 40), y: -20, v: 1.4 + Math.random() + g.score * .02 }); t = Math.max(18, 55 - g.score * .6); }
        B.forEach(b => b.y -= 9 * dt); E.forEach(e => e.y += e.v * dt);
        B.forEach(b => E.forEach(e => { if (!e.dead && !b.dead && Math.abs(b.x - e.x) < 20 && Math.abs(b.y - e.y) < 20) { e.dead = b.dead = 1; g.add(1); } }));
        E.forEach(e => { if (e.dead) return; if (e.y > H + 10 || (Math.abs(e.x - x) < 24 && Math.abs(e.y - 430) < 24)) { e.dead = 1; lives--; } });
        B = B.filter(b => !b.dead && b.y > -10); E = E.filter(e => !e.dead);
        c.shadowBlur = 14; c.shadowColor = c.fillStyle = '#22ff88'; B.forEach(b => c.fillRect(b.x - 2, b.y, 4, 12));
        c.shadowColor = c.fillStyle = '#ff2a55'; E.forEach(e => { c.beginPath(); c.moveTo(e.x, e.y + 16); c.lineTo(e.x - 16, e.y - 12); c.lineTo(e.x + 16, e.y - 12); c.fill(); });
        c.shadowColor = c.fillStyle = '#18c8ff'; c.beginPath(); c.moveTo(x, 408); c.lineTo(x - 18, 446); c.lineTo(x + 18, 446); c.fill();
        c.shadowBlur = 0; c.textAlign = 'center'; c.fillStyle = '#ff2a55'; c.font = '16px system-ui'; c.fillText('❤'.repeat(Math.max(lives, 0)), W / 2, H - 8);
        if (lives <= 0) g.end();
      }; } },
  { id: 'brick-breaker', t: 'Brick Breaker', c: 'arcade', e: '🕹️', col: '#ffe14d', hot: 60, h: 'Slide the paddle with your finger to bounce the ball and smash every brick. You have 3 lives.',
    make() { let px = 180, bl, br, lv = 3, sp = 4.2, wait = 40; const PAL = ['#ff2a55', '#ff9f1c', '#ffe14d', '#22ff88', '#18c8ff'];
      const mk = () => { br = []; for (let j = 0; j < 5; j++) for (let i = 0; i < 7; i++) br.push({ x: i * 52, y: 50 + j * 22, j }); };
      const reset = () => { bl = { x: px, y: 440, vx: (Math.random() < .5 ? -1 : 1) * sp * .6, vy: -sp * .8 }; wait = 40; };
      mk(); reset();
      return (c, p, g, dt) => {
        if (p.used) px += (p.x - px) * .4; if (K.ArrowLeft) px -= 7 * dt; if (K.ArrowRight) px += 7 * dt; px = clamp(px, 40, W - 40);
        if (wait > 0) { wait -= dt; bl.x = px; bl.y = 440; }
        else {
          const ox = bl.x; bl.x += bl.vx * dt; bl.y += bl.vy * dt;
          if (bl.x < 6 || bl.x > W - 6) { bl.vx *= -1; bl.x = clamp(bl.x, 6, W - 6); }
          if (bl.y < 6) { bl.vy = Math.abs(bl.vy); bl.y = 6; }
          if (bl.vy > 0 && bl.y > 444 && bl.y < 460 && Math.abs(bl.x - px) < 46) { bl.vx = (bl.x - px) / 46 * sp; bl.vy = -Math.sqrt(Math.max(sp * sp - bl.vx * bl.vx, 4)); }
          const i = br.findIndex(b => bl.x > b.x - 6 && bl.x < b.x + 54 && bl.y > b.y - 6 && bl.y < b.y + 24);
          if (i >= 0) { const b = br[i]; br.splice(i, 1); g.add(5 - b.j); if (ox < b.x - 3 || ox > b.x + 51) bl.vx *= -1; else bl.vy *= -1; }
          if (!br.length) { sp += .6; mk(); reset(); g.add(20); }
          if (bl.y > H) { lv--; if (lv <= 0) g.end(); else reset(); }
        }
        c.shadowBlur = 10; br.forEach(b => { c.shadowColor = c.fillStyle = PAL[b.j]; c.fillRect(b.x, b.y, 48, 18); });
        c.shadowColor = c.fillStyle = '#a855ff'; c.fillRect(px - 40, 450, 80, 10);
        c.shadowColor = c.fillStyle = '#fff'; c.beginPath(); c.arc(bl.x, bl.y, 6, 0, 7); c.fill();
        c.shadowBlur = 0; c.textAlign = 'center'; c.fillStyle = '#ff2a55'; c.font = '16px system-ui'; c.fillText('❤'.repeat(Math.max(lv, 0)), W / 2, H - 6);
      }; } },
  { id: 'hoop-shot', t: 'Hoop Shot', c: 'sports', e: '🏀', col: '#ff7a00', hot: 50, h: 'The hoop keeps moving. Tap where you want the ball to fly - aim ahead of the hoop! 3 misses and you are out.',
    make() { let t = 0, sp = .03, ball = null, miss = 0, msg = '', mt = 0;
      return (c, p, g, dt) => {
        t += dt; const hx = W / 2 + Math.sin(t * sp) * 115, hy = 120;
        if (p.tap && !ball) ball = { x: clamp(p.tap.x, 20, W - 20), y: 440 };
        if (ball) { ball.y -= 9 * dt;
          if (ball.y <= hy) { if (Math.abs(ball.x - hx) < 30) { g.add(2); sp = Math.min(.07, sp + .002); msg = 'SWISH!'; } else { miss++; msg = 'MISS'; } mt = 30; ball = null; if (miss >= 3) g.end(); } }
        c.fillStyle = '#e8e8ff'; c.fillRect(hx - 42, hy - 52, 84, 44);
        c.strokeStyle = '#ff7a00'; c.lineWidth = 5; c.beginPath(); c.moveTo(hx - 32, hy); c.lineTo(hx + 32, hy); c.stroke();
        c.strokeStyle = '#ffffff88'; c.lineWidth = 1; c.beginPath(); for (let i = -2; i <= 2; i++) { c.moveTo(hx + i * 15, hy); c.lineTo(hx + i * 9, hy + 26); } c.stroke();
        if (ball) { const r = 16 - (440 - ball.y) / 320 * 7; c.shadowBlur = 14; c.shadowColor = c.fillStyle = '#ff7a00'; c.beginPath(); c.arc(ball.x, ball.y, r, 0, 7); c.fill(); c.shadowBlur = 0; }
        c.textAlign = 'center'; if (mt > 0) { mt -= dt; c.fillStyle = msg === 'MISS' ? '#ff2a55' : '#22ff88'; c.font = '800 34px system-ui'; c.fillText(msg, W / 2, 260); }
        c.fillStyle = '#9aa0c8'; c.font = '700 14px system-ui'; c.fillText('Misses: ' + miss + '/3  -  tap to shoot', W / 2, H - 14);
      }; } }
];
const FEATURED = ['neon-racer', 'star-blaster', 'neon-ninja'];
const byId = id => GAMES.find(g => g.id === id);

/* ===== Favorites, recent, trending ===== */
const favs = () => store.get('favs', []);
const plays = () => store.get('plays', {});
const trending = () => [...GAMES].sort((a, b) => (b.hot + (plays()[b.id] || 0) * 5) - (a.hot + (plays()[a.id] || 0) * 5)).slice(0, 4);
const card = g => `<article class="card" style="--c:${g.col}">
  <a class="thumb" href="#/game/${g.id}" aria-label="Play ${g.t}"><span>${g.e}</span></a>
  <button class="fav ${favs().includes(g.id) ? 'on' : ''}" data-fav="${g.id}" aria-label="Toggle favorite">♥</button>
  <div class="cb"><small>${catName(g.c)}</small><h3>${g.t}</h3><a class="btn sm" href="#/game/${g.id}">▶ Play Now</a></div></article>`;
const sec = (title, list) => list.length ? `<section class="sec"><h2>${title}</h2><div class="grid">${list.map(card).join('')}</div></section>` : '';

document.addEventListener('click', e => {
  const b = e.target.closest('[data-fav]'); if (!b) return;
  const id = b.dataset.fav || b.getAttribute('data-fav'); let f = favs();
  f = f.includes(id) ? f.filter(x => x !== id) : [id, ...f]; store.set('favs', f);
  document.querySelectorAll('[data-fav="' + id + '"]').forEach(x => x.classList.toggle('on', f.includes(id)));
  if (window.refresh) window.refresh();
});

/* ===== Views ===== */
const app = $('#app'); let stop = null;
function home() {
  const recent = store.get('recent', []).map(byId).filter(Boolean), fv = favs().map(byId).filter(Boolean);
  app.innerHTML = `<section class="hero"><img src="logo.svg" alt="STRAPPED GAMING logo"><h1>ENTER THE GAME.<span>OWN THE UNIVERSE.</span></h1>
    <p>Free original games that play right in your browser. No downloads. No sign-up.</p>
    <form class="sbar" id="hs"><input type="search" id="hq" placeholder="Search games..." aria-label="Search games"><button class="btn" type="submit">Search</button></form>
    <a class="btn alt" href="#/games">Browse All Games</a></section>
    <section class="sec"><h2>Game Categories</h2><div class="cats">${CATS.map(c => `<a class="catc" href="#/games?cat=${c[0]}"><span>${c[2]}</span>${c[1]}</a>`).join('')}</div></section>
    ${sec('Featured Games', FEATURED.map(byId))}${sec('Trending Games', trending())}${sec('Recently Added', GAMES.slice(-4).reverse())}${sec('Recently Played', recent)}${sec('My Favorites', fv)}`;
  $('#hs').onsubmit = e => { e.preventDefault(); location.hash = '#/games?q=' + encodeURIComponent($('#hq').value.trim()); };
}
function gamesPage(q) {
  let cc = q.get('cat') || 'all', qq = q.get('q') || '';
  const chip = (id, n, ic) => `<button class="chip" data-cat="${id}">${ic} ${n}</button>`;
  app.innerHTML = `<section class="pg"><h1>All Games</h1><input type="search" id="gs" placeholder="Search games..." value="${esc(qq)}" aria-label="Search games">
    <div class="chips">${chip('all', 'All', '🎲')}${CATS.map(c => chip(c[0], c[1].replace(' Games', ''), c[2])).join('')}${chip('fav', 'Favorites', '♥')}</div><div id="gg" class="grid"></div></section>`;
  function render() {
    const f = favs(), s = qq.toLowerCase();
    const l = GAMES.filter(g => (cc === 'all' || (cc === 'fav' ? f.includes(g.id) : g.c === cc)) && (g.t + ' ' + catName(g.c)).toLowerCase().includes(s));
    $('#gg').innerHTML = l.length ? l.map(card).join('') : '<p class="empty">No games found. Try another search or category.</p>';
    document.querySelectorAll('.chip').forEach(b => b.classList.toggle('on', b.dataset.cat === cc));
  }
  $('#gs').oninput = e => { qq = e.target.value; render(); };
  document.querySelectorAll('.chip').forEach(b => b.onclick = () => { cc = b.dataset.cat; render(); });
  window.refresh = render; render();
}
function gamePage(id) {
  const g = byId(id); if (!g) return home();
  const pl = plays(); pl[id] = (pl[id] || 0) + 1; store.set('plays', pl);
  store.set('recent', [id, ...store.get('recent', []).filter(x => x !== id)].slice(0, 6));
  app.innerHTML = `<section class="gp"><a class="back" href="#/games">← All Games</a>
    <div class="gh"><div><small>${catName(g.c)}</small><h1>${g.t}</h1></div><button class="fav ${favs().includes(id) ? 'on' : ''}" data-fav="${id}" aria-label="Toggle favorite">♥</button></div>
    <div class="stage"><canvas id="cv" width="360" height="480" aria-label="${g.t} game"></canvas></div>
    <p class="help">🎮 ${g.h}</p><h2>More Games</h2><div class="grid">${GAMES.filter(x => x.id !== id).slice(0, 4).map(card).join('')}</div></section>`;
  stop = run(g, $('#cv'));
}
function about() {
  app.innerHTML = `<section class="pg"><h1>About Us</h1><p>STRAPPED GAMING is a free home for fast, fun browser games. Every game here is original, built from scratch, and made to play smoothly on Android phones as well as tablets and desktops.</p>
    <h2>What you get</h2><ul><li>${GAMES.length} playable games across ${CATS.length} categories</li><li>Touch-friendly controls on every game</li><li>Favorites and recently played lists saved on your device</li><li>No ads, no sign-up, no downloads</li></ul>
    <h2>Our mission</h2><p>Enter the game. Own the universe. We keep adding new games, so check back often.</p><a class="btn" href="#/games">Start Playing</a></section>`;
}
function contact() {
  app.innerHTML = `<section class="pg"><h1>Contact Us</h1><p>Found a bug or have a game idea? Send us a message and your email app will open with it ready to send.</p>
    <form id="cf"><input id="cn" required placeholder="Your name" aria-label="Your name"><input id="ce" type="email" required placeholder="Your email" aria-label="Your email"><textarea id="cm" rows="5" required placeholder="Your message" aria-label="Your message"></textarea><button class="btn" type="submit">Send Message</button><p class="ok" id="cs"></p></form></section>`;
  $('#cf').onsubmit = e => {
    e.preventDefault();
    const body = `From: ${$('#cn').value} (${$('#ce').value})\n\n${$('#cm').value}`;
    location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('STRAPPED GAMING message')}&body=${encodeURIComponent(body)}`;
    $('#cs').textContent = 'Opening your email app...';
  };
}
function privacy() {
  app.innerHTML = `<section class="pg"><h1>Privacy Policy</h1><p>Last updated: ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
    <h2>Information we collect</h2><p>STRAPPED GAMING does not collect, store or sell personal information. We have no accounts, no servers that receive your data and no tracking or advertising cookies.</p>
    <h2>Data stored on your device</h2><p>Your favorite games, recently played list, play counts and best scores are saved in your browser's local storage. This data never leaves your device. You can erase it any time by clearing your browser's site data.</p>
    <h2>Contact form</h2><p>The contact form opens your own email app. Messages are sent from your email account and only to the address shown in the form.</p>
    <h2>Children</h2><p>Our games are family friendly and we do not knowingly collect information from anyone.</p>
    <h2>Changes</h2><p>If this policy changes, the updated version will appear on this page.</p></section>`;
}

/* ===== Router ===== */
function route() {
  if (stop) { stop(); stop = null; } window.refresh = null;
  const [path, qs] = (location.hash.slice(1) || '/').split('?'), q = new URLSearchParams(qs || ''), parts = path.split('/').filter(Boolean), v = parts[0] || 'home';
  ({ games: () => gamesPage(q), game: () => gamePage(parts[1]), about, contact, privacy }[v] || home)();
  const active = v === 'game' ? 'games' : ({ games: 1, about: 1, contact: 1, privacy: 1 }[v] ? v : 'home');
  document.querySelectorAll('#nv a').forEach(a => a.classList.toggle('on', a.dataset.r === active));
  $('#nv').classList.remove('open'); $('#mb').setAttribute('aria-expanded', 'false');
  document.title = (v === 'game' && byId(parts[1]) ? byId(parts[1]).t + ' - ' : '') + 'STRAPPED GAMING';
  scrollTo(0, 0);
}
$('#mb').onclick = () => { const o = $('#nv').classList.toggle('open'); $('#mb').setAttribute('aria-expanded', o); };
$('#yr').textContent = new Date().getFullYear();
addEventListener('hashchange', route); route();
