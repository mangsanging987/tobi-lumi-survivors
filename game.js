'use strict';
/* Tobi & Lumi Survivors — Prototype v0.1 */

// ============ Setup ============
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W * DPR; canvas.height = H * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resize); resize();

// ============ Utils ============
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
const angTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }

// ============ Assets ============
const SPR = {};
let sprLoaded = 0;
function loadSprite(key, src) {
  const img = new Image();
  img.onload = () => { sprLoaded++; };
  img.onerror = () => { sprLoaded++; };
  img.src = src; SPR[key] = img;
}
loadSprite('tobi', 'assets/tobi-battle.png');
loadSprite('lumi', 'assets/lumi-battle.png');

// ============ Data ============
const CHARS = {
  tobi: { name: 'Tobi', hp: 70, speed: 230, weapon: 'claw', trait: '장난꾸러기: 공 계열 무기 +25%' },
  lumi: { name: 'Lumi', hp: 66, speed: 225, weapon: 'wave', trait: '되감기: 스테이지당 1회 부활' },
};
const WEAPONS = {
  claw:     { name: '할퀴기',     icon: '🐾', max: 5, desc: '전방 부채꼴 베기' },
  wave:     { name: '시계 파동',  icon: '🕐', max: 5, desc: '관통하는 시간 파동' },
  ball:     { name: '테니스공',   icon: '🎾', max: 5, desc: '벽과 적 사이를 튕김', ball: true },
  boom:     { name: '돌아와!',    icon: '🪃', max: 5, desc: '던졌다 돌아오는 공', ball: true },
  bone:     { name: '뼈다귀 회전', icon: '🦴', max: 5, desc: '주변을 도는 뼈다귀' },
  star:     { name: '별똥별',    icon: '🌠', max: 5, desc: '가장 가까운 적 추적' },
  clockbomb:{ name: '시계탑 폭발', icon: '💥', max: 5, desc: '주기적 광역 폭발+슬로우' },
};
const PASSIVES = {
  meat:   { name: '고기 간식',   icon: '🍖', max: 5, desc: '공격력 +8%' },
  wind:   { name: '바람',       icon: '💨', max: 5, desc: '이동속도 +6%' },
  magnet: { name: '자석 목걸이', icon: '🧲', max: 5, desc: '획득 범위 +25%' },
  paw:    { name: '튼튼한 발바닥', icon: '🐾', max: 5, desc: '최대 HP +10' },
};
const ENEMY_TYPES = {
  ticket: { name: '버려진 승차권', hp: 14, spd: 95,  dmg: 6,  xp: 1, r: 16 },
  glove:  { name: '외짝 장갑',   hp: 11, spd: 125, dmg: 7,  xp: 2, r: 15, dasher: true },
  umb:    { name: '잃어버린 우산', hp: 48, spd: 55,  dmg: 11, xp: 4, r: 23 },
};
const MAX_WEAPONS = 4, MAX_PASSIVES = 4;

// ============ State ============
let G = null;
function newGame(charId) {
  const c = CHARS[charId];
  G = {
    state: 'play', time: 0, kills: 0,
    char: charId,
    player: {
      x: 0, y: 0, hp: c.hp, maxHp: c.hp, speed: c.speed,
      lvl: 1, xp: 0, xpNeed: xpFor(1), r: 22,
      weapons: [{ id: c.weapon, lvl: 1, t: 0, ang: 0 }],
      passives: {}, face: 1, invuln: 0, atkAng: 0,
      rewindUsed: false, snaps: [], snapT: 0,
    },
    partner: { x: -40, y: 30, bond: 0, char: charId === 'tobi' ? 'lumi' : 'tobi' },
    enemies: [], projs: [], gems: [], parts: [], floats: [],
    spawnT: 0, shake: 0,
  };
}
function xpFor(lvl) { return Math.floor(6 + (lvl - 1) * 4 + Math.pow(lvl - 1, 1.7)); }
function atkMul() { return 1 + 0.08 * (G.player.passives.meat || 0); }
function spdMul() { return 1 + 0.06 * (G.player.passives.wind || 0); }
function magR() { return 110 * (1 + 0.25 * (G.player.passives.magnet || 0)); }

// ============ Input (joystick) ============
const joy = { active: false, id: null, bx: 0, by: 0, dx: 0, dy: 0 };
const joyEl = document.getElementById('joy'), knobEl = document.getElementById('joy-knob');
const keys = {};
window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (!joy.active && t.clientX < W * 0.7) {
      joy.active = true; joy.id = t.identifier;
      joy.bx = t.clientX; joy.by = t.clientY; joy.dx = 0; joy.dy = 0;
      joyEl.style.left = joy.bx + 'px'; joyEl.style.top = joy.by + 'px';
      joyEl.classList.remove('hidden');
    }
  }
}, { passive: false });
canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (joy.active && t.identifier === joy.id) {
      let dx = t.clientX - joy.bx, dy = t.clientY - joy.by;
      const d = Math.hypot(dx, dy), max = 46;
      if (d > max) { dx = dx / d * max; dy = dy / d * max; }
      joy.dx = dx / max; joy.dy = dy / max;
      knobEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }
  }
}, { passive: false });
function joyEnd(e) {
  for (const t of e.changedTouches) {
    if (joy.active && t.identifier === joy.id) {
      joy.active = false; joy.dx = 0; joy.dy = 0;
      joyEl.classList.add('hidden');
      knobEl.style.transform = 'translate(-50%,-50%)';
    }
  }
}
canvas.addEventListener('touchend', joyEnd); canvas.addEventListener('touchcancel', joyEnd);
// 데스크톱 테스트용 마우스
let mouseDown = false;
canvas.addEventListener('mousedown', e => {
  if (e.clientX < W * 0.7 && !joy.active) {
    mouseDown = true; joy.active = true; joy.id = 'mouse';
    joy.bx = e.clientX; joy.by = e.clientY; joy.dx = 0; joy.dy = 0;
    joyEl.style.left = joy.bx + 'px'; joyEl.style.top = joy.by + 'px';
    joyEl.classList.remove('hidden');
  }
});
window.addEventListener('mousemove', e => {
  if (joy.active && joy.id === 'mouse') {
    let dx = e.clientX - joy.bx, dy = e.clientY - joy.by;
    const d = Math.hypot(dx, dy), max = 46;
    if (d > max) { dx = dx / d * max; dy = dy / d * max; }
    joy.dx = dx / max; joy.dy = dy / max;
    knobEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }
});
window.addEventListener('mouseup', () => {
  if (joy.id === 'mouse') { joy.active = false; joy.dx = 0; joy.dy = 0; mouseDown = false; joyEl.classList.add('hidden'); knobEl.style.transform = 'translate(-50%,-50%)'; }
});
function inputVec() {
  let x = 0, y = 0;
  if (joy.active) { x = joy.dx; y = joy.dy; }
  if (keys['a'] || keys['arrowleft']) x -= 1;
  if (keys['d'] || keys['arrowright']) x += 1;
  if (keys['w'] || keys['arrowup']) y -= 1;
  if (keys['s'] || keys['arrowdown']) y += 1;
  const d = Math.hypot(x, y);
  if (d > 1) { x /= d; y /= d; }
  return { x, y };
}

// ============ Background (지하철 밤) ============
function drawBG(px, py, t) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#141126'); g.addColorStop(0.6, '#0e0c1c'); g.addColorStop(1, '#0a0916');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // 바닥 타일
  ctx.strokeStyle = 'rgba(120,110,180,0.10)'; ctx.lineWidth = 1;
  const tile = 140;
  const ox = -((px % tile) + tile) % tile, oy = -((py % tile) + tile) % tile;
  ctx.beginPath();
  for (let x = ox; x < W; x += tile) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = oy; y < H; y += tile) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  // 승강장 안전선 (수평으로 스크롤)
  const ly = H * 0.72 - (py % 400);
  for (let k = -1; k < 3; k++) {
    const y = ly + k * 400;
    if (y < -20 || y > H + 20) continue;
    ctx.fillStyle = 'rgba(255,200,90,0.10)'; ctx.fillRect(0, y, W, 6);
  }
  // 비네팅
  const v = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.35, W/2, H/2, Math.max(W,H)*0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}

// ============ Weapons ============
function nearestEnemy(x, y, maxD) {
  let best = null, bd = maxD * maxD;
  for (const e of G.enemies) {
    const d = dist2(x, y, e.x, e.y);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
function wDmg(base, w) {
  let m = atkMul() * (0.85 + 0.15 * w.lvl);
  if (G.char === 'tobi' && WEAPONS[w.id].ball) m *= 1.25; // 장난꾸러기
  return base * m;
}
function fireWeapon(w) {
  const p = G.player;
  const tgt = nearestEnemy(p.x, p.y, 700);
  const dir = tgt ? angTo(p.x, p.y, tgt.x, tgt.y) : (p.face > 0 ? 0 : Math.PI);
  p.atkAng = dir;
  const lvl = w.lvl;
  switch (w.id) {
    case 'claw': { // 전방 부채꼴 베기
      const range = 120 + lvl * 8, dmg = wDmg(9, w);
      for (const e of G.enemies) {
        if (dist2(p.x, p.y, e.x, e.y) < (range + e.r) * (range + e.r) &&
            Math.abs(angDiff(angTo(p.x, p.y, e.x, e.y), dir)) < 0.95) {
          const a = angTo(p.x, p.y, e.x, e.y);
          damageEnemy(e, dmg, Math.cos(a) * 260, Math.sin(a) * 260);
        }
      }
      G.parts.push({ kind: 'slash', x: p.x, y: p.y, ang: dir, t: 0, dur: 0.18, range });
      w.t = Math.max(0.45, 0.95 - lvl * 0.07);
      break;
    }
    case 'wave': { // 시계 파동
      const n = 1 + Math.floor(lvl / 3);
      for (let i = 0; i < n; i++) {
        const a = dir + (i - (n - 1) / 2) * 0.22;
        G.projs.push({ kind: 'wave', x: p.x, y: p.y, vx: Math.cos(a) * 400, vy: Math.sin(a) * 400,
          dmg: wDmg(8, w), pierce: 2 + lvl, r: 15, life: 1.4 });
      }
      w.t = Math.max(0.6, 1.25 - lvl * 0.09);
      break;
    }
    case 'ball': { // 테니스공 (튕김)
      const n = 1 + Math.floor(lvl / 2);
      for (let i = 0; i < n; i++) {
        const a = dir + rand(-0.15, 0.15) + (i - (n - 1) / 2) * 0.3;
        G.projs.push({ kind: 'ball', x: p.x, y: p.y, vx: Math.cos(a) * 460, vy: Math.sin(a) * 460,
          dmg: wDmg(10, w), bounce: 2 + lvl, r: 11, life: 3 });
      }
      w.t = Math.max(0.7, 1.45 - lvl * 0.1);
      break;
    }
    case 'boom': { // 돌아와! (부메랑)
      G.projs.push({ kind: 'boom', x: p.x, y: p.y, sx: p.x, sy: p.y,
        vx: Math.cos(dir) * 520, vy: Math.sin(dir) * 520,
        dmg: wDmg(8, w), r: 13, t: 0, dur: 0.55 + lvl * 0.06, back: false, hitSet: new Set() });
      w.t = Math.max(0.8, 1.6 - lvl * 0.1);
      break;
    }
    case 'bone': { // 뼈다귀 회전 (지속)
      break; // 틱에서 처리
    }
    case 'star': { // 별똥별 (추적)
      const n = 1 + Math.floor(lvl / 2);
      for (let i = 0; i < n; i++) {
        G.projs.push({ kind: 'star', x: p.x + rand(-10, 10), y: p.y + rand(-10, 10),
          vx: rand(-1, 1) * 200, vy: rand(-1, 1) * 200,
          dmg: wDmg(9, w), r: 10, life: 2.2, tgt: null });
      }
      w.t = Math.max(0.5, 1.1 - lvl * 0.08);
      break;
    }
    case 'clockbomb': { // 시계탑 폭발
      const R = 130 + lvl * 14, dmg = wDmg(15, w);
      for (const e of G.enemies) {
        if (dist2(p.x, p.y, e.x, e.y) < (R + e.r) * (R + e.r)) {
          const a = angTo(p.x, p.y, e.x, e.y);
          damageEnemy(e, dmg, Math.cos(a) * 320, Math.sin(a) * 320);
          e.slow = 2;
        }
      }
      G.parts.push({ kind: 'ring', x: p.x, y: p.y, t: 0, dur: 0.4, R });
      G.shake = Math.max(G.shake, 5);
      w.t = Math.max(1.6, 3.1 - lvl * 0.2);
      break;
    }
  }
}
function updateWeapons(dt) {
  const p = G.player;
  for (const w of p.weapons) {
    w.t -= dt;
    if (w.id === 'bone') { // 상시 회전
      w.ang = (w.ang || 0) + dt * (2.2 + w.lvl * 0.25);
      const n = 2 + Math.floor(w.lvl / 3), R = 74, dmg = wDmg(7, w);
      for (let i = 0; i < n; i++) {
        const a = w.ang + i * TAU / n;
        const bx = p.x + Math.cos(a) * R, by = p.y + Math.sin(a) * R;
        for (const e of G.enemies) {
          if (e.boneT && e.boneT > 0) continue;
          if (dist2(bx, by, e.x, e.y) < (e.r + 14) * (e.r + 14)) {
            const ba = angTo(p.x, p.y, e.x, e.y);
            damageEnemy(e, dmg, Math.cos(ba) * 200, Math.sin(ba) * 200);
            e.boneT = 0.35;
          }
        }
        if (i === 0) w.bx = bx, w.by = by; // 그리기용 (첫 번째만 저장, 나머지는 ang으로 계산)
      }
      continue;
    }
    if (w.t <= 0 && G.enemies.length > 0) fireWeapon(w);
    else if (w.t <= 0) w.t = 0.1;
  }
  for (const e of G.enemies) if (e.boneT > 0) e.boneT -= dt;
}
function updateProjs(dt) {
  const ps = G.projs;
  for (let i = ps.length - 1; i >= 0; i--) {
    const pr = ps[i];
    pr.life = (pr.life ?? 99) - dt;
    if (pr.kind === 'star') { // 추적
      if (!pr.tgt || pr.tgt.dead) pr.tgt = nearestEnemy(pr.x, pr.y, 500);
      if (pr.tgt) {
        const a = angTo(pr.x, pr.y, pr.tgt.x, pr.tgt.y);
        const sp = 460, cur = Math.atan2(pr.vy, pr.vx);
        const na = cur + clamp(angDiff(a, cur), -6 * dt, 6 * dt);
        pr.vx = Math.cos(na) * sp; pr.vy = Math.sin(na) * sp;
      }
      pr.x += pr.vx * dt; pr.y += pr.vy * dt;
    } else if (pr.kind === 'boom') { // 부메랑
      pr.t += dt;
      if (!pr.back && pr.t >= pr.dur) { pr.back = true; }
      if (pr.back) {
        const p = G.player, a = angTo(pr.x, pr.y, p.x, p.y), sp = 560;
        pr.vx = Math.cos(a) * sp; pr.vy = Math.sin(a) * sp;
        if (dist2(pr.x, pr.y, p.x, p.y) < 30 * 30) { ps.splice(i, 1); continue; }
      }
      pr.x += pr.vx * dt; pr.y += pr.vy * dt;
    } else {
      pr.x += pr.vx * dt; pr.y += pr.vy * dt;
      if (pr.kind === 'ball' && pr.bounce > 0) {
        // 화면 기준이 아니라 플레이어 주변 가상 벽에서 튕김 (간단히: 일정 거리 후 방향 전환)
        pr.bounceT = (pr.bounceT || 0) + dt;
        if (pr.bounceT > 0.55) {
          pr.bounceT = 0; pr.bounce--;
          const tgt = nearestEnemy(pr.x, pr.y, 600);
          if (tgt) { const a = angTo(pr.x, pr.y, tgt.x, tgt.y); const sp = Math.hypot(pr.vx, pr.vy) * 1.05;
            pr.vx = Math.cos(a) * sp; pr.vy = Math.sin(a) * sp; }
          else { pr.vx *= -1; pr.vy *= -1; }
        }
      }
    }
    // 적 충돌
    let dead = false;
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (pr.kind === 'boom' && pr.hitSet.has(e)) continue;
      if (dist2(pr.x, pr.y, e.x, e.y) < (pr.r + e.r) * (pr.r + e.r)) {
        const a = Math.atan2(pr.vy, pr.vx);
        damageEnemy(e, pr.dmg, Math.cos(a) * 180, Math.sin(a) * 180);
        if (pr.kind === 'boom') { pr.hitSet.add(e); }
        else if (pr.pierce > 0) { pr.pierce--; }
        else { dead = true; break; }
      }
    }
    if (dead || pr.life <= 0) ps.splice(i, 1);
  }
}

// ============ Enemies ============
function spawnEnemy(force) {
  if (G.enemies.length > 70) return;
  const t = G.time;
  const pool = ['ticket', 'ticket', 'ticket'];
  if (t > 25 || force === 'glove') pool.push('glove', 'glove');
  if (t > 70 || force === 'umb') pool.push('umb');
  const type = force || pool[randInt(0, pool.length - 1)];
  const base = ENEMY_TYPES[type];
  const hpMul = 1 + t / 200, dmgMul = 1 + t / 320;
  const a = rand(0, TAU), d = Math.max(W, H) * 0.62;
  G.enemies.push({
    type, x: G.player.x + Math.cos(a) * d, y: G.player.y + Math.sin(a) * d,
    hp: base.hp * hpMul, maxHp: base.hp * hpMul, spd: base.spd * rand(0.9, 1.1),
    dmg: base.dmg * dmgMul, xp: base.xp, r: base.r,
    vx: 0, vy: 0, flash: 0, slow: 0, boneT: 0, dead: false,
    seed: rand(0, TAU), dashT: rand(0, 2), dashing: 0, tele: 0,
  });
}
function damageEnemy(e, dmg, kx, ky) {
  if (e.dead) return;
  e.hp -= dmg; e.flash = 0.12;
  e.vx += kx * 0.02; e.vy += ky * 0.02;
  G.floats.push({ x: e.x, y: e.y - e.r - 6, txt: Math.round(dmg), t: 0 });
  if (e.hp <= 0) {
    e.dead = true; G.kills++;
    G.gems.push({ x: e.x, y: e.y, vx: rand(-60, 60), vy: rand(-60, 60), v: e.xp });
    for (let i = 0; i < 8; i++)
      G.parts.push({ kind: 'poof', x: e.x, y: e.y, vx: rand(-140, 140), vy: rand(-140, 140), t: 0, dur: rand(0.3, 0.6) });
  }
}
function updateEnemies(dt) {
  const p = G.player;
  for (const e of G.enemies) {
    if (e.frozen > 0) { e.frozen -= dt; continue; } // 시간 정지 중
    if (e.flash > 0) e.flash -= dt;
    if (e.slow > 0) e.slow -= dt;
    const spMul = e.slow > 0 ? 0.45 : 1;
    const a = angTo(e.x, e.y, p.x, p.y);
    if (e.type === 'glove') { // 돌진 패턴
      e.dashT -= dt;
      if (e.dashing > 0) {
        e.dashing -= dt;
        e.x += Math.cos(e.dashA) * e.spd * 3.2 * spMul * dt;
        e.y += Math.sin(e.dashA) * e.spd * 3.2 * spMul * dt;
      } else if (e.tele > 0) {
        e.tele -= dt; e.dashA = a;
        if (e.tele <= 0) e.dashing = 0.38;
      } else {
        e.x += Math.cos(a) * e.spd * 0.55 * spMul * dt;
        e.y += Math.sin(a) * e.spd * 0.55 * spMul * dt;
        if (e.dashT <= 0 && dist2(e.x, e.y, p.x, p.y) < 340 * 340) { e.tele = 0.45; e.dashT = rand(1.6, 2.8); }
      }
    } else {
      const wob = Math.sin(G.time * 3 + e.seed) * 0.25;
      const ma = a + wob * 0.4;
      e.x += (Math.cos(ma) * e.spd * spMul + e.vx) * dt;
      e.y += (Math.sin(ma) * e.spd * spMul + e.vy) * dt;
    }
    e.vx *= 0.86; e.vy *= 0.86;
    // 접촉 피해
    if (p.invuln <= 0 && dist2(e.x, e.y, p.x, p.y) < (e.r + p.r - 4) * (e.r + p.r - 4)) {
      hurtPlayer(e.dmg, angTo(e.x, e.y, p.x, p.y)); // 적→플레이어 방향으로 넉백
    }
  }
  // 분리 (겹침 해소)
  const es = G.enemies;
  for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++) {
    const a = es[i], b = es[j];
    const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r;
    const d2 = dx * dx + dy * dy;
    if (d2 < rr * rr && d2 > 0.01) {
      const d = Math.sqrt(d2), push = (rr - d) / 2 * 0.5;
      const nx = dx / d, ny = dy / d;
      a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
    }
  }
  for (let i = es.length - 1; i >= 0; i--) if (es[i].dead) es.splice(i, 1);
}
function hurtPlayer(dmg, ang) {
  const p = G.player;
  // Lumi 되감기
  if (p.hp - dmg <= 0 && G.char === 'lumi' && !p.rewindUsed && p.snaps.length > 0) {
    const s = p.snaps[0];
    p.x = s.x; p.y = s.y; p.hp = Math.max(s.hp, p.maxHp * 0.4);
    p.rewindUsed = true; p.invuln = 2;
    G.floats.push({ x: p.x, y: p.y - 40, txt: '⏪ 되감기!', t: 0, big: true });
    for (let i = 0; i < 20; i++)
      G.parts.push({ kind: 'poof', x: p.x, y: p.y, vx: rand(-200, 200), vy: rand(-200, 200), t: 0, dur: 0.6 });
    return;
  }
  p.hp -= dmg; p.invuln = 0.6;
  p.x += Math.cos(ang) * 26; p.y += Math.sin(ang) * 26;
  G.shake = Math.max(G.shake, 6);
  G.floats.push({ x: p.x, y: p.y - 40, txt: '-' + Math.round(dmg), t: 0, hurt: true });
  if (p.hp <= 0) { p.hp = 0; gameOver(); }
}

// ============ Enemy Art (귀엽 + 기괴) ============
function drawEyes(x, y, r, color) {
  ctx.save();
  ctx.shadowColor = color; ctx.shadowBlur = 12;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(x - r * 0.45, y, r * 0.28, r * 0.38, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + r * 0.45, y, r * 0.28, r * 0.38, 0, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#1a0f00';
  ctx.beginPath(); ctx.ellipse(x - r * 0.45, y + r * 0.08, r * 0.1, r * 0.16, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + r * 0.45, y + r * 0.08, r * 0.1, r * 0.16, 0, 0, TAU); ctx.fill();
}
function drawEnemy(e) {
  const wob = Math.sin(G.time * 4 + e.seed) * 0.12;
  ctx.save(); ctx.translate(e.x, e.y);
  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(0, e.r * 0.9, e.r * 0.9, e.r * 0.3, 0, 0, TAU); ctx.fill();
  ctx.rotate(wob);
  const frozen = e.frozen > 0;
  if (frozen) ctx.globalAlpha = 0.75;
  if (e.type === 'ticket') {
    // 버려진 승차권 — 누렇게 바랜 종이, 찢긴 단면
    ctx.fillStyle = '#8f8464';
    ctx.beginPath(); ctx.roundRect(-20, -13, 40, 26, 5); ctx.fill();
    ctx.fillStyle = '#7a7052';
    ctx.beginPath(); ctx.roundRect(-20, -13, 10, 26, 5); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-10, -11); ctx.lineTo(-10, 11); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('ADMIT', 6, 3);
    drawEyes(6, -1, 13, '#ffb02e');
  } else if (e.type === 'glove') {
    // 외짝 장갑 — 벙어리장갑, 돌진 전에는 눈이 붉어짐
    const tele = e.tele > 0;
    ctx.fillStyle = tele ? '#9c5a6e' : '#7d5f74';
    ctx.beginPath(); ctx.roundRect(-13, -16, 26, 32, 10); ctx.fill();
    ctx.beginPath(); ctx.ellipse(13, -2, 7, 11, 0.5, 0, TAU); ctx.fill(); // 엄지
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-13, 8); ctx.lineTo(13, 8); ctx.stroke(); // 손목 주름
    drawEyes(0, -3, 12, tele ? '#ff3b3b' : '#ffb02e');
  } else if (e.type === 'umb') {
    // 잃어버린 우산 — 처진 캐노피 아래로 눈이 빛남
    const bob = Math.sin(G.time * 2.2 + e.seed) * 3;
    ctx.translate(0, bob);
    ctx.fillStyle = '#4a3a63';
    ctx.beginPath(); ctx.moveTo(-26, 6);
    ctx.quadraticCurveTo(0, -30, 26, 6);
    ctx.quadraticCurveTo(13, -2, 0, 6); ctx.quadraticCurveTo(-13, -2, -26, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 10, -16 + Math.abs(i) * 3); ctx.lineTo(i * 12, 5); ctx.stroke(); }
    ctx.strokeStyle = '#3a2f52'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(0, 24); ctx.quadraticCurveTo(0, 32, -8, 30); ctx.stroke();
    drawEyes(0, -2, 14, '#c77dff');
  }
  ctx.restore();
  if (frozen) { // 빙결 표시
    ctx.strokeStyle = 'rgba(140,220,255,0.8)'; ctx.lineWidth = 2;
    ctx.strokeRect(e.x - e.r - 3, e.y - e.r - 3, (e.r + 3) * 2, (e.r + 3) * 2);
  }
  if (e.flash > 0) { // 피격 플래시
    ctx.globalAlpha = Math.min(1, e.flash * 6);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // HP 바 (다친 적만)
  if (e.hp < e.maxHp) {
    const w = e.r * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(e.x - w / 2, e.y - e.r - 10, w, 4);
    ctx.fillStyle = '#ff5d73'; ctx.fillRect(e.x - w / 2, e.y - e.r - 10, w * clamp(e.hp / e.maxHp, 0, 1), 4);
  }
}
function drawBone(x, y, a, s) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s);
  ctx.fillStyle = '#efe8d8';
  ctx.fillRect(-10, -3.5, 20, 7);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    ctx.beginPath(); ctx.arc(sx * 10, sy * 4.5, 4.5, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
function drawProjs() {
  for (const pr of G.projs) {
    if (pr.kind === 'wave') {
      ctx.save(); ctx.shadowColor = '#7dd8ff'; ctx.shadowBlur = 14;
      ctx.strokeStyle = 'rgba(125,216,255,0.9)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(pr.x, pr.y); ctx.lineTo(pr.x, pr.y - 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pr.x, pr.y); ctx.lineTo(pr.x + 5, pr.y + 2); ctx.stroke();
      ctx.restore();
    } else if (pr.kind === 'ball' || pr.kind === 'boom') {
      ctx.save(); ctx.shadowColor = '#d8ff5d'; ctx.shadowBlur = 10;
      ctx.fillStyle = '#cfe86b';
      ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r - 3, 0.6, 2.4); ctx.stroke();
      ctx.restore();
    } else if (pr.kind === 'star') {
      ctx.save(); ctx.translate(pr.x, pr.y); ctx.shadowColor = '#ffe27d'; ctx.shadowBlur = 12;
      ctx.fillStyle = '#ffe27d';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 11 : 5, a = i * Math.PI / 5 - Math.PI / 2;
        ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }
  // 뼈다귀 궤도
  const p = G.player, bw = p.weapons.find(w => w.id === 'bone');
  if (bw) {
    const n = 2 + Math.floor(bw.lvl / 3), R = 74;
    for (let i = 0; i < n; i++) {
      const a = bw.ang + i * TAU / n;
      drawBone(p.x + Math.cos(a) * R, p.y + Math.sin(a) * R, a + 0.6, 1);
    }
  }
}
function drawParts(dt) {
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const pt = G.parts[i]; pt.t += dt;
    const k = pt.t / pt.dur;
    if (k >= 1) { G.parts.splice(i, 1); continue; }
    if (pt.kind === 'poof') {
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = '#8f87b3';
      ctx.beginPath(); ctx.arc(pt.x + pt.vx * pt.t, pt.y + pt.vy * pt.t, 6 * (1 - k) + 2, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (pt.kind === 'slash') {
      ctx.save(); ctx.translate(pt.x, pt.y); ctx.rotate(pt.ang);
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 10;
      ctx.beginPath(); ctx.arc(0, 0, pt.range * (0.6 + k * 0.4), -0.9, 0.9); ctx.stroke();
      ctx.restore(); ctx.globalAlpha = 1;
    } else if (pt.kind === 'ring') {
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = '#ffd76d'; ctx.lineWidth = 8 * (1 - k) + 2;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.R * k, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}
function drawGems() {
  for (const gm of G.gems) {
    ctx.save(); ctx.shadowColor = '#7dd8ff'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#9fe8ff';
    ctx.translate(gm.x, gm.y); ctx.rotate(Math.PI / 4);
    const s = 6 + Math.min(4, gm.v);
    ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.restore();
  }
}
function drawFloats(dt) {
  ctx.textAlign = 'center'; ctx.font = 'bold 14px sans-serif';
  for (let i = G.floats.length - 1; i >= 0; i--) {
    const f = G.floats[i]; f.t += dt;
    if (f.t > 0.8) { G.floats.splice(i, 1); continue; }
    ctx.globalAlpha = 1 - f.t / 0.8;
    ctx.fillStyle = f.hurt ? '#ff5d73' : '#fff';
    ctx.font = f.big ? 'bold 22px sans-serif' : 'bold 14px sans-serif';
    ctx.fillText(f.txt, f.x, f.y - f.t * 40);
    ctx.globalAlpha = 1;
  }
}
function drawPlayer() {
  const p = G.player;
  if (p.invuln > 0 && Math.floor(G.time * 14) % 2 === 0) return; // 무적 깜빡임
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 30, 24, 8, 0, 0, TAU); ctx.fill();
  const img = SPR[G.char];
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.face, 1);
  if (img && img.complete && img.naturalWidth) ctx.drawImage(img, -38, -44, 76, 76);
  else { ctx.fillStyle = G.char === 'tobi' ? '#c98a4b' : '#e8e2f2'; ctx.beginPath(); ctx.arc(0, -6, 26, 0, TAU); ctx.fill(); }
  ctx.restore();
  // HP 바
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(p.x - 26, p.y - 52, 52, 5);
  ctx.fillStyle = '#5dff8a'; ctx.fillRect(p.x - 26, p.y - 52, 52 * clamp(p.hp / p.maxHp, 0, 1), 5);
}
function drawPartner() {
  const pt = G.partner, img = SPR[pt.char];
  const bob = Math.sin(G.time * 5) * 3;
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(pt.x, pt.y + 22, 16, 5, 0, 0, TAU); ctx.fill();
  if (img && img.complete && img.naturalWidth) ctx.drawImage(img, pt.x - 26, pt.y - 30 + bob, 52, 52);
  ctx.globalAlpha = 1;
}

// ============ Gems / Partner ============
function updateGems(dt) {
  const p = G.player, mr = magR();
  for (let i = G.gems.length - 1; i >= 0; i--) {
    const gm = G.gems[i];
    gm.x += gm.vx * dt; gm.y += gm.vy * dt; gm.vx *= 0.9; gm.vy *= 0.9;
    const d2 = dist2(gm.x, gm.y, p.x, p.y);
    if (d2 < mr * mr) {
      const a = angTo(gm.x, gm.y, p.x, p.y), sp = 520;
      gm.x += Math.cos(a) * sp * dt; gm.y += Math.sin(a) * sp * dt;
    }
    if (d2 < 26 * 26) {
      p.xp += gm.v; G.partner.bond = Math.min(100, G.partner.bond + 2.2);
      G.gems.splice(i, 1);
    }
  }
}
function updatePartner(dt) {
  const p = G.player, pt = G.partner;
  const tx = p.x - p.face * 52, ty = p.y + 26;
  pt.x += (tx - pt.x) * Math.min(1, 5 * dt);
  pt.y += (ty - pt.y) * Math.min(1, 5 * dt);
  pt.bond = Math.min(100, pt.bond + 1.1 * dt);
  partnerBtn.classList.toggle('ready', pt.bond >= 100);
}
const partnerBtn = document.getElementById('partner-btn');
partnerBtn.addEventListener('click', () => {
  if (!G || G.state !== 'play' || G.partner.bond < 100) return;
  G.partner.bond = 0;
  const p = G.player;
  if (G.partner.char === 'tobi') {
    for (let i = 0; i < 10; i++) {
      const a = i * TAU / 10;
      G.projs.push({ kind: 'ball', x: p.x, y: p.y, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420,
        dmg: 14 * atkMul(), bounce: 0, r: 11, life: 1.1 });
    }
    G.floats.push({ x: p.x, y: p.y - 50, txt: '신나게 물어와!', t: 0, big: true });
  } else {
    for (const e of G.enemies) e.frozen = 3;
    G.floats.push({ x: p.x, y: p.y - 50, txt: '잠깐 멈춰!', t: 0, big: true });
    G.parts.push({ kind: 'ring', x: p.x, y: p.y, t: 0, dur: 0.6, R: 300 });
  }
  partnerBtn.classList.remove('ready');
});

// ============ Level up ============
const lvScreen = document.getElementById('screen-levelup');
const lvChoices = document.getElementById('lv-choices');
function openLevelUp() {
  G.state = 'levelup';
  const p = G.player, pool = [];
  const wCount = p.weapons.length, pCount = Object.keys(p.passives).length;
  for (const id in WEAPONS) {
    const w = p.weapons.find(w => w.id === id);
    if (!w && wCount < MAX_WEAPONS) pool.push({ t: 'new', id });
    else if (w && w.lvl < WEAPONS[id].max) pool.push({ t: 'up', id });
  }
  for (const id in PASSIVES) {
    const l = p.passives[id] || 0;
    if (l < PASSIVES[id].max && (l > 0 || pCount < MAX_PASSIVES)) pool.push({ t: 'passive', id });
  }
  for (let i = pool.length - 1; i > 0; i--) { const j = randInt(0, i);[pool[i], pool[j]] = [pool[j], pool[i]]; }
  const picks = pool.slice(0, 3);
  lvChoices.innerHTML = '';
  if (!picks.length) {
    lvChoices.innerHTML = `<button class="lv-choice" data-i="heal"><b>🍖 간식 타임</b><p>HP 30 회복</p></button>`;
  } else picks.forEach((c, i) => {
    let title, desc;
    if (c.t === 'new') { title = `${WEAPONS[c.id].icon} ${WEAPONS[c.id].name}`; desc = WEAPONS[c.id].desc + ' (신규!)'; }
    else if (c.t === 'up') { const w = p.weapons.find(w => w.id === c.id); title = `${WEAPONS[c.id].icon} ${WEAPONS[c.id].name} <span class="new">Lv ${w.lvl} → ${w.lvl + 1}</span>`; desc = WEAPONS[c.id].desc; }
    else { const l = p.passives[c.id] || 0; title = `${PASSIVES[c.id].icon} ${PASSIVES[c.id].name} <span class="new">${l ? `Lv ${l} → ${l + 1}` : '신규!'}</span>`; desc = PASSIVES[c.id].desc; }
    const b = document.createElement('button');
    b.className = 'lv-choice'; b.innerHTML = `<b>${title}</b><p>${desc}</p>`;
    b.addEventListener('click', () => applyChoice(c));
    lvChoices.appendChild(b);
  });
  const healBtn = lvChoices.querySelector('[data-i="heal"]');
  if (healBtn) healBtn.addEventListener('click', () => applyChoice({ t: 'heal' }));
  lvScreen.classList.remove('hidden');
}
function applyChoice(c) {
  const p = G.player;
  if (c.t === 'new') p.weapons.push({ id: c.id, lvl: 1, t: 0.3, ang: rand(0, TAU) });
  else if (c.t === 'up') p.weapons.find(w => w.id === c.id).lvl++;
  else if (c.t === 'passive') {
    p.passives[c.id] = (p.passives[c.id] || 0) + 1;
    if (c.id === 'paw') { p.maxHp += 10; p.hp = Math.min(p.maxHp, p.hp + 10); }
  }
  else if (c.t === 'heal') p.hp = Math.min(p.maxHp, p.hp + 30);
  lvScreen.classList.add('hidden');
  G.state = 'play';
  updateWeaponsBar();
}

// ============ HUD ============
const hpBar = document.getElementById('hp-bar'), hpText = document.getElementById('hp-text');
const xpBar = document.getElementById('xp-bar'), timerEl = document.getElementById('timer');
const killsEl = document.getElementById('kills'), levelEl = document.getElementById('level');
const weaponsBar = document.getElementById('weapons-bar');
let hudT = 0;
function updateHUD(dt) {
  hudT -= dt; if (hudT > 0) return; hudT = 0.12;
  const p = G.player;
  hpBar.style.width = clamp(p.hp / p.maxHp * 100, 0, 100) + '%';
  hpText.textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
  xpBar.style.width = clamp(p.xp / p.xpNeed * 100, 0, 100) + '%';
  const m = Math.floor(G.time / 60), s = Math.floor(G.time % 60);
  timerEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
  killsEl.textContent = `${G.kills} 처치`;
  levelEl.textContent = `Lv ${p.lvl}`;
  const bw = document.getElementById('bond-bar');
  if (bw) bw.style.width = G.partner.bond + '%';
}
function updateWeaponsBar() {
  const p = G.player;
  weaponsBar.innerHTML = p.weapons.map(w => `<span title="${WEAPONS[w.id].name} Lv${w.lvl}">${WEAPONS[w.id].icon}<sup style="font-size:10px">${w.lvl}</sup></span>`).join('');
}

// ============ Main update / render ============
function update(dt) {
  const p = G.player;
  G.time += dt;
  // 이동
  const iv = inputVec();
  const sp = p.speed * spdMul();
  p.x += iv.x * sp * dt; p.y += iv.y * sp * dt;
  if (iv.x !== 0) p.face = iv.x > 0 ? 1 : -1;
  if (iv.x || iv.y) p.atkAng = Math.atan2(iv.y, iv.x);
  if (p.invuln > 0) p.invuln -= dt;
  // 되감기 스냅샷 (0.5초마다, 3초 보관)
  p.snapT += dt;
  if (p.snapT >= 0.5) { p.snapT = 0; p.snaps.push({ x: p.x, y: p.y, hp: p.hp }); if (p.snaps.length > 6) p.snaps.shift(); }
  // 스폰
  G.spawnT -= dt;
  if (G.spawnT <= 0) {
    spawnEnemy();
    if (G.time > 50 && Math.random() < 0.3) spawnEnemy();
    G.spawnT = Math.max(0.32, 1.15 - G.time * 0.004);
  }
  updateWeapons(dt); updateProjs(dt); updateEnemies(dt); updateGems(dt); updatePartner(dt);
  drawParts(0); drawFloats(0);
  // 레벨업
  while (p.xp >= p.xpNeed) {
    p.xp -= p.xpNeed; p.lvl++; p.xpNeed = xpFor(p.lvl);
    openLevelUp();
    break;
  }
  updateHUD(dt);
}
function render() {
  ctx.save();
  if (G && G.shake > 0) {
    ctx.translate(rand(-G.shake, G.shake), rand(-G.shake, G.shake));
    G.shake *= 0.88; if (G.shake < 0.3) G.shake = 0;
  }
  const px = G ? G.player.x : 0, py = G ? G.player.y : 0;
  const cx = px - W / 2, cy = py - H / 2;
  ctx.save(); ctx.translate(-cx, -cy);
  drawBG(cx, cy, G ? G.time : 0);
  if (G) {
    drawGems();
    const sorted = [...G.enemies].sort((a, b) => a.y - b.y);
    for (const e of sorted) drawEnemy(e);
    drawProjs();
    drawPartner();
    drawPlayer();
  }
  ctx.restore();
  if (G) { drawParts(1 / 60); drawFloats(1 / 60); }
  ctx.restore();
}
let lastTs = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0);
  lastTs = ts;
  if (G && G.state === 'play') update(dt);
  render();
}

// ============ Screens ============
const titleScreen = document.getElementById('screen-title');
const overScreen = document.getElementById('screen-over');
document.querySelectorAll('.char-card').forEach(b => {
  b.addEventListener('click', () => startGame(b.dataset.char));
});
function startGame(charId) {
  newGame(charId);
  titleScreen.classList.add('hidden');
  overScreen.classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  document.getElementById('bond-wrap').classList.remove('hidden');
  partnerBtn.classList.remove('hidden');
  updateWeaponsBar();
}
function gameOver() {
  G.state = 'over';
  const m = Math.floor(G.time / 60), s = Math.floor(G.time % 60);
  document.getElementById('over-stats').innerHTML =
    `생존 시간 <b>${m}:${String(s).padStart(2, '0')}</b><br>처치 <b>${G.kills}</b> · 레벨 <b>${G.player.lvl}</b>`;
  overScreen.classList.remove('hidden');
  partnerBtn.classList.add('hidden');
}
document.getElementById('btn-retry').addEventListener('click', () => {
  overScreen.classList.add('hidden');
  document.getElementById('hud').classList.add('hidden');
  partnerBtn.classList.add('hidden');
  titleScreen.classList.remove('hidden');
  G = null;
});
requestAnimationFrame(loop);
// 테스트용 자동 시작 (?auto=tobi|lumi)
try {
  const auto = new URLSearchParams(location.search).get('auto');
  if (auto === 'tobi' || auto === 'lumi') setTimeout(() => startGame(auto), 400);
} catch (e) {}
