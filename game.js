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
const ASSET_V = 'v=0.10.3';
loadSprite('tobi', 'assets/tobi-battle.png?' + ASSET_V);
loadSprite('lumi', 'assets/lumi-battle.png?' + ASSET_V);
// 캐릭터 걷기 애니메이션 프레임 (6프레임)
for (let i = 0; i < 6; i++) loadSprite('tobi-walk-' + i, `assets/tobi-walk-${i}.png?` + ASSET_V);
for (let i = 0; i < 6; i++) loadSprite('lumi-walk-' + i, `assets/lumi-walk-${i}.png?` + ASSET_V);
const CHAR_ANIM = {
  tobi: { walk: [['tobi-walk-0', 0.819], ['tobi-walk-1', 0.828], ['tobi-walk-2', 0.806], ['tobi-walk-3', 0.768], ['tobi-walk-4', 0.863], ['tobi-walk-5', 0.866]] },
  lumi: { walk: [['lumi-walk-0', 0.853], ['lumi-walk-1', 0.810], ['lumi-walk-2', 0.836], ['lumi-walk-3', 0.836], ['lumi-walk-4', 0.866], ['lumi-walk-5', 0.871]] },
};
loadSprite('enemy-ticket', 'assets/enemy-ticket.png?' + ASSET_V);
loadSprite('enemy-glove', 'assets/enemy-glove.png?' + ASSET_V);
loadSprite('enemy-umbrella', 'assets/enemy-umbrella.png?' + ASSET_V);
loadSprite('enemy-can', 'assets/enemy-can.png?' + ASSET_V);
loadSprite('enemy-paper', 'assets/enemy-paper.png?' + ASSET_V);
loadSprite('enemy-pack', 'assets/enemy-pack.png?' + ASSET_V);
loadSprite('enemy-elite-inspector', 'assets/enemy-elite-inspector.png?' + ASSET_V);
loadSprite('enemy-elite-luggage', 'assets/enemy-elite-luggage.png?' + ASSET_V);
loadSprite('enemy-elite-announce', 'assets/enemy-elite-announce.png?' + ASSET_V);
loadSprite('enemy-boss-train', 'assets/enemy-boss-train.png?' + ASSET_V);
const ENEMY_SPR = { ticket: 'enemy-ticket', glove: 'enemy-glove', umb: 'enemy-umbrella', can: 'enemy-can', paper: 'enemy-paper', pack: 'enemy-pack' };
const ENEMY_DIMS = { ticket: [48, 48], glove: [46, 46], umb: [70, 37], can: [46, 46], paper: [52, 52], pack: [58, 58] };
// 일반몹 걷기 애니메이션 (6프레임)
for (const t of ['ticket', 'glove', 'umb', 'can', 'paper', 'pack'])
  for (let i = 0; i < 6; i++) loadSprite(`enemy-${t}-walk-${i}`, `assets/enemy-${t}-walk-${i}.png?` + ASSET_V);
const ENEMY_ANIM = {
  ticket: [[0, 1.067], [1, 1.054], [2, 1.032], [3, 1.0], [4, 1.093], [5, 1.08]],
  glove: [[0, 0.945], [1, 1.005], [2, 0.94], [3, 0.975], [4, 0.95], [5, 0.965]],
  umb: [[0, 0.921], [1, 0.89], [2, 0.881], [3, 0.909], [4, 0.89], [5, 0.931]],
  can: [[0, 0.91], [1, 0.914], [2, 0.906], [3, 0.97], [4, 1.0], [5, 0.965]],
  paper: [[0, 0.975], [1, 1.035], [2, 0.965], [3, 0.985], [4, 1.04], [5, 1.01]],
  pack: [[0, 0.944], [1, 0.975], [2, 0.96], [3, 0.995], [4, 0.985], [5, 1.07]],
  paperbit: [[0, 0.975], [1, 1.035], [2, 0.965], [3, 0.985], [4, 1.04], [5, 1.01]],
};
const ENEMY_ANIM_H = { ticket: 31, glove: 30, umb: 36, can: 30, paper: 34, pack: 38, paperbit: 17 };
// paperbit는 paper 스프라이트를 재사용 (50% 크기)
loadSprite('bg-floor', 'assets/bg-floor.png?' + ASSET_V);
loadSprite('bg-rock', 'assets/bg-rock.png?' + ASSET_V);
loadSprite('prop-trashcan', 'assets/prop-trashcan.png?' + ASSET_V);
loadSprite('prop-bench', 'assets/prop-bench.png?' + ASSET_V);
loadSprite('bg-trash', 'assets/bg-trash.png?' + ASSET_V);

// ============ 배경: 황폐한 지하철역 ============
function hash2(x, y) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}
// 돌무더기(막힘): 1000px 셀당 42% 확률, 스폰 지점(원점 반경 700px) 제외
// 충돌은 발판 전체를 타원으로 막음 (뒤로 숨을 수 없음)
const ROCK_CELL = 1000, ROCK_RX = 66, ROCK_RY = 38, ROCK_CY = -28;
function rockInCell(cx, cy) {
  const h = hash2(cx, cy);
  if (h % 100 >= 42) return null;
  const jx = (hash2(cx, 7 - cy) % 640) - 320;
  const jy = (hash2(3 - cx, cy) % 640) - 320;
  const x = cx * ROCK_CELL + 500 + jx, y = cy * ROCK_CELL + 500 + jy;
  if (x * x + y * y < 700 * 700) return null;
  return { x, y };
}
function eachRockNear(x, y, r, cb) {
  const x0 = Math.floor((x - r) / ROCK_CELL), x1 = Math.floor((x + r) / ROCK_CELL);
  const y0 = Math.floor((y - r) / ROCK_CELL), y1 = Math.floor((y + r) / ROCK_CELL);
  for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
    const pl = rockInCell(cx, cy);
    if (pl) cb(pl);
  }
}
function collideRocks(o, rad) {
  eachRockNear(o.x, o.y, rad + 72, (rk) => {
    const cx = rk.x, cy = rk.y + ROCK_CY;
    const rx = ROCK_RX + rad, ry = ROCK_RY + rad;
    const dx = (o.x - cx) / rx, dy = (o.y - cy) / ry;
    const d2 = dx * dx + dy * dy;
    if (d2 < 1) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        o.x = cx + dx / d * rx;
        o.y = cy + dy / d * ry;
      } else { o.x = cx + rx; o.y = cy; }
    }
  });
}
// 쓰레기 장식(막히지 않음): 420px 셀당 55% 확률
const TRASH_CELL = 420;
function trashInCell(cx, cy) {
  const h = hash2(cx + 131, cy - 57);
  if (h % 100 >= 55) return null;
  const jx = (hash2(cx, cy + 911) % 300) - 150;
  const jy = (hash2(cx - 313, cy) % 300) - 150;
  return {
    x: cx * TRASH_CELL + 210 + jx, y: cy * TRASH_CELL + 210 + jy,
    rot: (h % 628) / 100, s: 0.7 + (h % 60) / 100,
  };
}
function drawRock(rk) {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.ellipse(rk.x, rk.y + 10, 72, 20, 0, 0, TAU); ctx.fill();
  const spr = sprFor('bg-rock', 140, 86);
  if (spr) ctx.drawImage(spr, rk.x - 70, rk.y - 72, 140, 86);
}
function drawTrashLayer(cx, cy) {
  const x0 = Math.floor(cx / TRASH_CELL), x1 = Math.floor((cx + W) / TRASH_CELL);
  const y0 = Math.floor(cy / TRASH_CELL), y1 = Math.floor((cy + H) / TRASH_CELL);
  const spr = sprFor('bg-trash', 96, 89);
  if (!spr) return;
  for (let tx = x0; tx <= x1; tx++) for (let ty = y0; ty <= y1; ty++) {
    const t = trashInCell(tx, ty);
    if (!t) continue;
    const s = 96 * t.s;
    ctx.save();
    ctx.translate(t.x, t.y); ctx.rotate(t.rot);
    ctx.globalAlpha = 0.92;
    ctx.drawImage(spr, -s / 2, -s / 2, s, s * 0.927);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
// 스프라이트 미리 축소 (모바일 성능) — 레티나 대응: DPR 배율로 미리 렌더
const PREP = {};
function sprFor(key, w, h) {
  const img = SPR[key];
  if (!img || !img.complete || !img.naturalWidth) return null;
  if (!PREP[key]) {
    const s = Math.min(DPR || 1, 2);
    const c = document.createElement('canvas'); c.width = Math.ceil(w * s); c.height = Math.ceil(h * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    PREP[key] = c;
  }
  return PREP[key];
}

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
  // ---- 진화 무기 (레벨업 진화로만 획득, max 1) ----
  clawstorm:   { name: '폭풍 할퀴기', icon: '🌪️', max: 5, evo: true, desc: '3연속 베기, 범위 대폭 증가' },
  steelfoot:   { name: '강철 발톱',  icon: '🦾', max: 5, evo: true, desc: '3연속 베기 + 적중 시 짧은 기절' },
  eternalclock:{ name: '영원의 시계', icon: '⏳', max: 5, evo: true, desc: '나갔다 돌아오는 왕복 파동' },
  homerun:     { name: '홈런볼',     icon: '⚾', max: 5, evo: true, ball: true, desc: '초고속 관통 강속구' },
  lightningfetch:{ name: '번개 페치', icon: '⚡', max: 5, evo: true, ball: true, desc: '초고속 왕복 + 궤적에 번개 피해' },
  satbone:     { name: '위성 뼈다귀', icon: '🛰️', max: 5, evo: true, desc: '3개의 뼈다귀, 넓은 궤도' },
  meteorshower:{ name: '유성우',     icon: '☄️', max: 5, evo: true, desc: '추적탄 9연발 동시 발사' },
  guardbell:   { name: '수호의 종',  icon: '🔔', max: 5, evo: true, desc: '광역 폭발 + 방어 필드 생성' },
  infinityrally:{ name: '무한 랠리', icon: '🔁', max: 5, evo: true, ball: true, desc: '튈수록 강해지고 반드시 돌아옴' },
  doomsday:    { name: '종말의 시계', icon: '⏰', max: 5, evo: true, desc: '파동 적중 시 폭발, 연쇄 반응' },
};
const EVOS = {
  clawstorm:    { needs: { weapon: 'claw', passive: 'meat' } },
  steelfoot:    { needs: { weapon: 'claw', passive: 'paw' } },
  eternalclock: { needs: { weapon: 'wave', passive: 'magnet' } },
  homerun:      { needs: { weapon: 'ball', passive: 'wind' } },
  lightningfetch:{ needs: { weapon: 'boom', passive: 'wind' } },
  satbone:      { needs: { weapon: 'bone', passive: 'magnet' } },
  meteorshower: { needs: { weapon: 'star', passive: 'meat' } },
  guardbell:    { needs: { weapon: 'clockbomb', passive: 'paw' } },
  infinityrally:{ needs: { weapons: ['ball', 'boom'] } },
  doomsday:     { needs: { weapons: ['wave', 'clockbomb'] } },
};
// 무기 → 진화 결과 역조회 (진화 방향 표시용)
const EVO_OF = {};
for (const id in EVOS) {
  const nd = EVOS[id].needs;
  const mats = nd.weapons || [nd.weapon];
  for (const m of mats) { (EVO_OF[m] = EVO_OF[m] || []).push({ evo: id, needs: nd }); }
}
function evoHint(wid) {
  const list = EVO_OF[wid];
  if (!list) return '';
  const ready = evoCandidates();
  return list.map(({ evo, needs }) => {
    const E = WEAPONS[evo];
    let mats;
    if (needs.weapons)
      mats = needs.weapons.map(id => `${WEAPONS[id].icon} ${WEAPONS[id].name}`).join(' + ');
    else
      mats = `${WEAPONS[needs.weapon].icon} ${WEAPONS[needs.weapon].name} + ${PASSIVES[needs.passive].icon} ${PASSIVES[needs.passive].name}`;
    const ok = ready.includes(evo) ? ' <b>✨진화 가능!</b>' : '';
    return `<br><span class="evo-hint">${mats} → ${E.icon} ${E.name}${ok}</span>`;
  }).join('');
}
function evoCandidates() {
  const p = G.player, out = [];
  for (const id in EVOS) {
    if (p.weapons.find(w => w.id === id)) continue; // 이미 진화됨
    const nd = EVOS[id].needs;
    if (nd.weapons) {
      if (nd.weapons.every(wid => { const w = p.weapons.find(w => w.id === wid); return w && w.lvl >= WEAPONS[wid].max; })) out.push(id);
    } else {
      const w = p.weapons.find(w => w.id === nd.weapon);
      if (w && w.lvl >= WEAPONS[nd.weapon].max && (p.passives[nd.passive] || 0) > 0) out.push(id);
    }
  }
  return out;
}
const PASSIVES = {
  meat:   { name: '고기 간식',   icon: '🍖', max: 5, desc: '공격력 +8%' },
  wind:   { name: '바람',       icon: '💨', max: 5, desc: '이동속도 +6%' },
  magnet: { name: '자석 목걸이', icon: '🧲', max: 5, desc: '획득 범위 +25%' },
  paw:    { name: '튼튼한 발바닥', icon: '🐾', max: 5, desc: '최대 HP +10' },
};
const SPD_MUL = 0.85; // 전체 속도감 조절 (이동/탄약)
const ENEMY_TYPES = {
  ticket: { name: '찢어진 티켓', hp: 14, spd: 95,  dmg: 6,  xp: 1, r: 16 },
  glove:  { name: '겨울 장갑',   hp: 11, spd: 125, dmg: 7,  xp: 2, r: 15, dasher: true },
  umb:    { name: '버려진 우산', hp: 48, spd: 55,  dmg: 11, xp: 4, r: 23 },
  can:    { name: '빈 음료캔',   hp: 10, spd: 140, dmg: 6,  xp: 2, r: 14 },
  paper:  { name: '버려진 신문', hp: 55, spd: 50,  dmg: 10, xp: 4, r: 24 },
  pack:   { name: '잃어버린 백팩', hp: 110, spd: 55,  dmg: 13, xp: 6, r: 26 },
  paperbit:{ name: '작은 신문',   hp: 12, spd: 75,  dmg: 5,  xp: 1, r: 12 },
};
const MAX_WEAPONS = 4, MAX_PASSIVES = 4;

// ============ State ============
let G = null;
function newGame(charId, startKs) {
  const c = CHARS[charId];
  const ks = {};
  for (const kid of (startKs || [])) {
    ks[kid] = true;
    if (kid === 'watch') ks.watchN = 3;
  }
  G = {
    state: 'play', time: 0, kills: 0,
    char: charId,
    player: {
      x: 0, y: 0, hp: c.hp, maxHp: c.hp, speed: c.speed,
      lvl: 1, xp: 0, xpNeed: xpFor(1), r: 22,
      weapons: [{ id: c.weapon, lvl: 1, t: 0, ang: 0 }],
      consumed: [], // 진화에 소모된 무기 (다시 획득 가능)
      passives: {}, keepsakes: ks, scarfCd: 0, face: 1, invuln: 0, atkAng: 0,
      rewindUsed: false, snaps: [], snapT: 0, moving: false,
    },
    partner: { x: -40, y: 30, bond: 0, char: charId === 'tobi' ? 'lumi' : 'tobi' },
    enemies: [], projs: [], eprojs: [], gems: [], parts: [], floats: [],
    pickups: [], props: [], propT: 2, ticketT: 100,
    elite1: false, elite2: false, elite3: false, bossSpawned: false,
    warn1: false, warn2: false, warn3: false, warnBoss: false,
    bondTier: 0, banner: null, bossActive: false,
    spawnT: 0, shake: 0, zones: [],
  };
}
function xpFor(lvl) { return Math.floor(6 + (lvl - 1) * 4 + Math.pow(lvl - 1, 1.7)); }
function atkMul() { return 1 + 0.08 * (G.player.passives.meat || 0); }
function spdMul() {
  const p = G.player;
  let m = 1 + 0.06 * (p.passives.wind || 0);
  if (p.keepsakes.sock && p.sockT > 0) m *= 1.5;
  return m;
}
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
// drawBG: 월드 좌표계에서 호출, (wx,wy)=화면 좌상단의 월드 좌표
function drawBG(wx, wy) {
  // 황폐한 지하철역 바닥 타일
  const T = 512;
  const spr = sprFor('bg-floor', T, T);
  if (!spr) return;
  const ox = wx - (((wx % T) + T) % T);
  const oy = wy - (((wy % T) + T) % T);
  for (let x = ox; x < wx + W; x += T)
    for (let y = oy; y < wy + H; y += T)
      ctx.drawImage(spr, x, y, T, T);
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
      for (const pr of G.props) {
        if (pr.dead) continue;
        if (dist2(p.x, p.y, pr.x, pr.y) < (range + pr.r) * (range + pr.r) &&
            Math.abs(angDiff(angTo(p.x, p.y, pr.x, pr.y), dir)) < 0.95) {
          damageProp(pr, dmg);
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
        const bn = 2 + lvl;
        G.projs.push({ kind: 'ball', x: p.x, y: p.y, vx: Math.cos(a) * 460, vy: Math.sin(a) * 460,
          dmg: wDmg(10, w), bounce: bn, bounce0: bn, r: 11, life: 3 });
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
      hurtProps(p.x, p.y, R, dmg);
      G.parts.push({ kind: 'ring', x: p.x, y: p.y, t: 0, dur: 0.4, R });
      G.shake = Math.max(G.shake, 5);
      w.t = Math.max(1.6, 3.1 - lvl * 0.2);
      break;
    }
    // ============ 진화 무기 ============
    case 'clawstorm': case 'steelfoot': { // 3연속 베기 (+기절)
      const range = w.id === 'clawstorm' ? 195 : 170, dmg = wDmg(w.id === 'clawstorm' ? 15 : 14, w);
      for (let k = -1; k <= 1; k++) {
        const sa = dir + k * 0.38;
        for (const e of G.enemies) {
          if (dist2(p.x, p.y, e.x, e.y) < (range + e.r) * (range + e.r) &&
              Math.abs(angDiff(angTo(p.x, p.y, e.x, e.y), sa)) < 0.85) {
            const a = angTo(p.x, p.y, e.x, e.y);
            damageEnemy(e, dmg, Math.cos(a) * 300, Math.sin(a) * 300);
            if (w.id === 'steelfoot' && !e.isBoss) e.frozen = Math.max(e.frozen, 0.6);
          }
        }
        G.parts.push({ kind: 'slash', x: p.x, y: p.y, ang: sa, t: -k * 0.05, dur: 0.22, range });
      }
      hurtProps(p.x, p.y, range, dmg);
      w.t = 0.85;
      break;
    }
    case 'eternalclock': { // 왕복 파동
      for (let i = -1; i <= 1; i += 2) {
        const a = dir + i * 0.12;
        G.projs.push({ kind: 'wave2', x: p.x, y: p.y,
          vx: Math.cos(a) * 430, vy: Math.sin(a) * 430,
          dmg: wDmg(13, w), pierce: 99, r: 17, life: 4, t: 0, dur: 0.75, back: false, hitSet: new Set() });
      }
      w.t = 1.0;
      break;
    }
    case 'homerun': { // 초고속 관통 강속구
      G.projs.push({ kind: 'homer', x: p.x, y: p.y,
        vx: Math.cos(dir) * 780, vy: Math.sin(dir) * 780,
        dmg: wDmg(24, w), pierce: 9, r: 14, life: 1.2 });
      G.parts.push({ kind: 'ring', x: p.x, y: p.y, t: 0, dur: 0.25, R: 40 });
      w.t = 1.05;
      break;
    }
    case 'lightningfetch': { // 초고속 왕복 + 번개 궤적
      G.projs.push({ kind: 'zapboom', x: p.x, y: p.y, sx: p.x, sy: p.y,
        vx: Math.cos(dir) * 800, vy: Math.sin(dir) * 800,
        dmg: wDmg(11, w), r: 13, t: 0, dur: 0.4, back: false, hitSet: new Set(), trailT: 0 });
      w.t = 1.1;
      break;
    }
    case 'satbone': { // 위성 뼈다귀 (지속)
      break; // 틱에서 처리
    }
    case 'meteorshower': { // 추적탄 9연발
      for (let i = 0; i < 9; i++) {
        G.projs.push({ kind: 'star', x: p.x + rand(-24, 24), y: p.y + rand(-24, 24),
          vx: rand(-1, 1) * 260, vy: rand(-1, 1) * 260,
          dmg: wDmg(11, w), r: 11, life: 2.6, tgt: null });
      }
      w.t = 1.35;
      break;
    }
    case 'guardbell': { // 광역 폭발 + 방어 필드
      const R = 260, dmg = wDmg(24, w);
      for (const e of G.enemies) {
        if (dist2(p.x, p.y, e.x, e.y) < (R + e.r) * (R + e.r)) {
          const a = angTo(p.x, p.y, e.x, e.y);
          damageEnemy(e, dmg, Math.cos(a) * 360, Math.sin(a) * 360);
          e.slow = 2;
        }
      }
      hurtProps(p.x, p.y, R, dmg);
      G.parts.push({ kind: 'ring', x: p.x, y: p.y, t: 0, dur: 0.5, R });
      G.zones.push({ kind: 'shield', x: p.x, y: p.y, r: 120, t: 4, dur: 4, tick: 0, dmg: wDmg(6, w), slow: 1.5 });
      G.shake = Math.max(G.shake, 6);
      w.t = 2.6;
      break;
    }
    case 'infinityrally': { // 튈수록 강해지고 반드시 돌아옴
      G.projs.push({ kind: 'rally', x: p.x, y: p.y,
        vx: Math.cos(dir) * 520, vy: Math.sin(dir) * 520,
        dmg: wDmg(12, w), pierce: 99, bounce: 6, bounceT: 0, back: false, r: 12, life: 6, hitSet: new Set() });
      w.t = 1.2;
      break;
    }
    case 'doomsday': { // 파동 적중 시 폭발
      for (let i = -1; i <= 1; i++) {
        const a = dir + i * 0.18;
        G.projs.push({ kind: 'doom', x: p.x, y: p.y,
          vx: Math.cos(a) * 400, vy: Math.sin(a) * 400,
          dmg: wDmg(13, w), pierce: 5, r: 15, life: 1.6 });
      }
      w.t = 1.15;
      break;
    }
  }
}
function updateWeapons(dt) {
  const p = G.player;
  for (const w of p.weapons) {
    w.t -= dt;
    if (w.id === 'bone' || w.id === 'satbone') { // 상시 회전
      const sat = w.id === 'satbone';
      w.ang = (w.ang || 0) + dt * (sat ? 2.8 : 2.2 + w.lvl * 0.25);
      const n = sat ? 3 : 2 + Math.floor(w.lvl / 3), R = sat ? 104 : 74, dmg = wDmg(sat ? 12 : 7, w);
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
        hurtProps(bx, by, 18, dmg);
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
      pr.x += pr.vx * SPD_MUL * dt; pr.y += pr.vy * SPD_MUL * dt;
    } else if (pr.kind === 'boom' || pr.kind === 'zapboom' || pr.kind === 'wave2') { // 부메랑 (왕복)
      pr.t += dt;
      if (pr.kind === 'zapboom') { // 번개 궤적
        pr.trailT -= dt;
        if (pr.trailT <= 0) {
          pr.trailT = 0.06;
          G.zones.push({ kind: 'zap', x: pr.x, y: pr.y, r: 45, t: 0.5, dur: 0.5, tick: 0, dmg: pr.dmg * 0.4 });
        }
      }
      if (!pr.back && pr.t >= pr.dur) { pr.back = true; }
      if (pr.back) {
        const p = G.player, a = angTo(pr.x, pr.y, p.x, p.y), sp = pr.kind === 'zapboom' ? 800 : 560;
        pr.vx = Math.cos(a) * sp; pr.vy = Math.sin(a) * sp;
        if (dist2(pr.x, pr.y, p.x, p.y) < 30 * 30) { ps.splice(i, 1); continue; }
      }
      pr.x += pr.vx * SPD_MUL * dt; pr.y += pr.vy * SPD_MUL * dt;
    } else if (pr.kind === 'rally') { // 무한 랠리: 튈수록 강해지고 반드시 귀환
      pr.bounceT += dt;
      if (!pr.back) {
        if (pr.bounceT > 0.5) {
          pr.bounceT = 0; pr.bounce--; pr.dmg *= 1.25;
          if (pr.bounce <= 0) pr.back = true;
          else {
            const tgt = nearestEnemy(pr.x, pr.y, 600);
            const sp = Math.hypot(pr.vx, pr.vy) * 1.06;
            if (tgt) { const a = angTo(pr.x, pr.y, tgt.x, tgt.y); pr.vx = Math.cos(a) * sp; pr.vy = Math.sin(a) * sp; }
            else { pr.vx *= -1; pr.vy *= -1; }
          }
        }
      } else {
        const p = G.player, a = angTo(pr.x, pr.y, p.x, p.y), sp = 640;
        pr.vx = Math.cos(a) * sp; pr.vy = Math.sin(a) * sp;
        if (dist2(pr.x, pr.y, p.x, p.y) < 34 * 34) { ps.splice(i, 1); continue; }
      }
      pr.x += pr.vx * SPD_MUL * dt; pr.y += pr.vy * SPD_MUL * dt;
    } else {
      pr.x += pr.vx * SPD_MUL * dt; pr.y += pr.vy * SPD_MUL * dt;
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
      if (pr.hitSet && pr.hitSet.has(e)) continue;
      if (dist2(pr.x, pr.y, e.x, e.y) < (pr.r + e.r) * (pr.r + e.r)) {
        const a = Math.atan2(pr.vy, pr.vx);
        let dmg = pr.dmg;
        // 낡은 테니스공: 튈수록 강해짐
        if ((pr.kind === 'ball' || pr.kind === 'homer' || pr.kind === 'rally') && G.player.keepsakes.tennis && pr.bounce0 !== undefined)
          dmg = pr.dmg * (1 + 0.1 * Math.min(5, pr.bounce0 - pr.bounce));
        damageEnemy(e, dmg, Math.cos(a) * 180, Math.sin(a) * 180);
        if (pr.kind === 'doom') explodeDoom(pr.x, pr.y, pr.dmg); // 종말의 시계: 연쇄 폭발
        if (pr.hitSet) { pr.hitSet.add(e); }
        else if (pr.pierce > 0) { pr.pierce--; }
        else { dead = true; break; }
      }
    }
    // 오브젝트는 통과하면서 데미지 (막히지 않음)
    if (!dead) {
      for (const pr2 of G.props) {
        if (pr2.dead) continue;
        if (dist2(pr.x, pr.y, pr2.x, pr2.y) < (pr.r + pr2.r) * (pr.r + pr2.r)) {
          damageProp(pr2, pr.dmg);
        }
      }
    }
    if (dead || pr.life <= 0) ps.splice(i, 1);
  }
}
// 적 투사체 (우산·수하물 Elite 등이 발사)
function updateEprojs(dt) {
  const p = G.player, ps = G.eprojs;
  for (let i = ps.length - 1; i >= 0; i--) {
    const pr = ps[i];
    pr.life -= dt;
    pr.x += pr.vx * SPD_MUL * dt; pr.y += pr.vy * SPD_MUL * dt;
    let dead = pr.life <= 0;
    if (!dead && p.invuln <= 0 && dist2(pr.x, pr.y, p.x, p.y) < (pr.r + p.r - 4) * (pr.r + p.r - 4)) {
      hurtPlayer(pr.dmg, Math.atan2(pr.vy, pr.vx));
      dead = true;
    }
    if (dead) { ps.splice(i, 1); continue; }
  }
}
function drawEprojs() {
  for (const pr of G.eprojs) {
    ctx.globalAlpha = 0.3; ctx.fillStyle = pr.color || '#b48cff';
    ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r * 1.8, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = pr.color || '#b48cff';
    ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r * 0.4, 0, TAU); ctx.fill();
  }
}
function explodeDoom(x, y, dmg) { // 종말의 시계: 적중 지점 폭발 + 미니 파동 생성
  const R = 95, d = dmg * 0.8;
  for (const e of G.enemies) {
    if (e.dead) continue;
    if (dist2(x, y, e.x, e.y) < (R + e.r) * (R + e.r)) {
      const a = angTo(x, y, e.x, e.y);
      damageEnemy(e, d, Math.cos(a) * 260, Math.sin(a) * 260);
    }
  }
  hurtProps(x, y, R, d);
  G.parts.push({ kind: 'ring', x, y, t: 0, dur: 0.35, R });
  for (let s = 0; s < 2; s++) {
    const a = rand(0, TAU);
    G.projs.push({ kind: 'doommini', x, y, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380,
      dmg: dmg * 0.5, pierce: 2, r: 12, life: 0.9 });
  }
}
function updateZones(dt) { // 방어 필드 / 번개 궤적 / 독 장판 / 낙석 경고
  const p = G.player;
  for (let i = G.zones.length - 1; i >= 0; i--) {
    const z = G.zones[i]; z.t -= dt; z.tick -= dt;
    if (z.kind === 'rockwarn') { // 낙석 경고: 시간 끝나면 돌이 떨어짐
      if (z.t <= 0) {
        if (dist2(z.x, z.y, p.x, p.y) < (z.r + p.r) * (z.r + p.r))
          hurtPlayer(z.pdmg, angTo(z.x, z.y, p.x, p.y));
        for (let k = 0; k < 12; k++)
          G.parts.push({ kind: 'poof', x: z.x + rand(-24, 24), y: z.y + rand(-24, 24),
            vx: rand(-160, 160), vy: rand(-160, 160), t: 0, dur: 0.7 });
        G.shake = Math.max(G.shake, 8);
        G.zones.splice(i, 1);
      }
      continue;
    }
    if (z.tick <= 0) {
      z.tick = 0.15;
      if (z.dmg) { // 독 장판(pdmg만 있음)은 적에게 피해 없음
        for (const e of G.enemies) {
          if (e.dead) continue;
          if (dist2(z.x, z.y, e.x, e.y) < (z.r + e.r) * (z.r + e.r)) {
            const a = angTo(z.x, z.y, e.x, e.y);
            damageEnemy(e, z.dmg, Math.cos(a) * 120, Math.sin(a) * 120);
            if (z.slow) e.slow = Math.max(e.slow || 0, z.slow);
          }
        }
        hurtProps(z.x, z.y, z.r, z.dmg);
      }
      // 독 장판: 서 있는 플레이어에게 지속 피해 (무적 무시)
      if (z.pdmg && dist2(z.x, z.y, p.x, p.y) < (z.r + p.r * 0.5) * (z.r + p.r * 0.5))
        hurtPlayer(z.pdmg * 0.15, angTo(z.x, z.y, p.x, p.y), true);
    }
    if (z.t <= 0) G.zones.splice(i, 1);
  }
}

// ============ Keepsake ============
const KEEPSAKES = {
  tennis: { name: '낡은 테니스공', icon: '🎾', desc: '공이 튈수록 강해짐 (튐당 +10%, 최대 5회)' },
  watch: { name: '금간 손목시계', icon: '⏱️', desc: '피격 시 1초 시간 정지 (3회)' },
  scarf: { name: '따뜻한 목도리', icon: '🧣', desc: '둘러싸이면 3초 방어막 (쿨 30초)' },
  milk: { name: '빈 우유곽', icon: '🥛', desc: 'HP 30% 이하에서 30 회복 (1회)' },
  earbud: { name: '한쪽 이어버드', icon: '🎧', desc: '젬 50개 연속 획득 시 음파 폭발 (피격 시 리셋)' },
  note: { name: '접힌 쪽지', icon: '📝', desc: '레벨업 선택지가 4개로 증가' },
  sock: { name: '짝 잃은 양말', icon: '🧦', desc: '가만히 있다 움직이면 2초간 가속' },
  glasses: { name: '깨진 선글라스', icon: '🕶️', desc: '치명상 1회 무효 + 주변 넉백' },
  photo: { name: '오래된 사진', icon: '📷', desc: '파트너 스킬 30% 확률로 2회 발동' },
  whistle: { name: '녹슨 호루라기', icon: '📯', desc: '유대감 2배속 충전, 10초 안에 사용' },
};
// 엘리트 처치: 유물 3개 중 1개 선택
function openKeepsakeChoice() {
  const owned = G.player.keepsakes;
  const rest = Object.keys(KEEPSAKES).filter(k => !owned[k]);
  if (!rest.length) {
    G.player.hp = Math.min(G.player.maxHp, G.player.hp + 50);
    setBanner('유물이 더 이상 없다… HP +50');
    return;
  }
  // 3개 추첨 (남은 게 3개 미만이면 전부)
  for (let i = rest.length - 1; i > 0; i--) { const j = randInt(0, i);[rest[i], rest[j]] = [rest[j], rest[i]]; }
  const picks = rest.slice(0, 3);
  G.state = 'keepsake';
  ksChoices.innerHTML = '';
  picks.forEach(kid => {
    const K = KEEPSAKES[kid];
    const b = document.createElement('button');
    b.className = 'lv-choice';
    b.innerHTML = `<b>${K.icon} ${K.name}</b><p>${K.desc}</p>`;
    b.addEventListener('click', () => {
      const p = G.player;
      p.keepsakes[kid] = true;
      if (kid === 'watch') p.keepsakes.watchN = 3;
      ksScreen.classList.add('hidden');
      G.state = 'play';
      setBanner(`${K.icon} 유물 획득: ${K.name}`);
      G.floats.push({ x: p.x, y: p.y - 70, txt: `${K.icon} ${K.name} 획득!`, t: 0, big: true });
      updateKeepsakeBar();
    });
    ksChoices.appendChild(b);
  });
  ksScreen.classList.remove('hidden');
}
function dropKeepsake(x, y) { openKeepsakeChoice(); }

// ============ Banner ============
function setBanner(txt) { G.banner = { txt, t: 0 }; }

// ============ Elite & Boss ============
const ELITE_DEFS = {
  ticket: { hp: 900, name: '티켓 검사관', spr: 'enemy-elite-inspector', dims: [110, 110], r: 28,
    walk: [['elite-ticket-0', 1.031], ['elite-ticket-1', 0.995], ['elite-ticket-2', 1.031], ['elite-ticket-3', 0.995], ['elite-ticket-4', 1.026], ['elite-ticket-5', 1.046]] },
  glove: { hp: 2200, name: '잃어버린 수하물', spr: 'enemy-elite-luggage', dims: [120, 120], r: 32,
    walk: [['elite-glove-0', 0.975], ['elite-glove-1', 0.96], ['elite-glove-2', 1.005], ['elite-glove-3', 0.995], ['elite-glove-4', 0.995], ['elite-glove-5', 1.042]] },
  umb: { hp: 3800, name: '고장난 안내방송', spr: 'enemy-elite-announce', dims: [116, 110], r: 30,
    walk: [['elite-umb-0', 0.936], ['elite-umb-1', 0.936], ['elite-umb-2', 0.926], ['elite-umb-3', 0.975], ['elite-umb-4', 0.985], ['elite-umb-5', 0.995]] },
};
for (const t of ['ticket', 'glove', 'umb'])
  for (let i = 0; i < 6; i++) loadSprite(`elite-${t}-${i}`, `assets/elite-${t}-${i}.png?` + ASSET_V);
for (let i = 0; i < 6; i++) loadSprite('boss-walk-' + i, `assets/boss-walk-${i}.png?` + ASSET_V);
const BOSS_WALK = [['boss-walk-0', 1.091], ['boss-walk-1', 1.053], ['boss-walk-2', 1.031], ['boss-walk-3', 1.089], ['boss-walk-4', 1.036], ['boss-walk-5', 0.995]];
function spawnMinion(type, x, y) {
  if (G.enemies.length > 90) return;
  const base = ENEMY_TYPES[type], t = G.time;
  const hpMul = 1 + t / 200, dmgMul = 1 + t / 320;
  G.enemies.push({
    type, x, y, hp: base.hp * hpMul, maxHp: base.hp * hpMul,
    spd: base.spd * rand(0.9, 1.1) * SPD_MUL, dmg: base.dmg * dmgMul, xp: base.xp, r: base.r,
    vx: 0, vy: 0, flash: 0, slow: 0, frozen: 0, boneT: 0, dead: false,
    seed: rand(0, TAU), dashT: rand(0, 2), dashing: 0, tele: 0,
  });
  const ne = G.enemies[G.enemies.length - 1];
  collideRocks(ne, ne.r); // 돌무더기 안에 스폰되면 밖으로
}
function spawnElite(kind) {
  const base = ENEMY_TYPES[kind], def = ELITE_DEFS[kind];
  const t = G.time, hpMul = 1 + t / 200;
  const a = rand(0, TAU), d = Math.max(W, H) * 0.6;
  G.enemies.push({
    type: kind, elite: true, ename: def.name,
    x: G.player.x + Math.cos(a) * d, y: G.player.y + Math.sin(a) * d,
    hp: def.hp * hpMul, maxHp: def.hp * hpMul,
    spd: base.spd * 0.85 * SPD_MUL, dmg: base.dmg * 2 * (1 + t / 320), xp: 0, r: def.r,
    vx: 0, vy: 0, flash: 0, slow: 0, frozen: 0, boneT: 0, dead: false,
    seed: rand(0, TAU), dashT: rand(0, 2), dashing: 0, tele: 0,
    patT: 2.5, warnT: 0, chargeA: 0, charging: 0,
  });
  setBanner(`⚠ ${def.name} 출현!`);
}
function updateElite(e, dt) {
  const p = G.player, a = angTo(e.x, e.y, p.x, p.y);
  if (e.type === 'ticket') { // 연속 돌진 (3연속)
    if (e.charging > 0) {
      e.charging -= dt;
      e.x += Math.cos(e.chargeA) * e.spd * 3.4 * dt;
      e.y += Math.sin(e.chargeA) * e.spd * 3.4 * dt;
      if (e.charging <= 0) {
        G.shake = Math.max(G.shake, 5); // 돌진 타격 순간
        if ((e.chain || 0) > 0) { e.chain--; e.warnT = 0.4; } // 바로 다음 돌진 예고
      }
    } else if (e.warnT > 0) {
      e.warnT -= dt; e.chargeA = a;
      if (e.warnT <= 0) { e.charging = 0.7; G.shake = Math.max(G.shake, 6); }
    } else {
      e.x += Math.cos(a) * e.spd * dt; e.y += Math.sin(a) * e.spd * dt;
      e.patT -= dt;
      if (e.patT <= 0 && dist2(e.x, e.y, p.x, p.y) < 420 * 420) {
        e.warnT = 0.7; e.patT = 6; e.chain = 2; // 총 3연속
        G.floats.push({ x: e.x, y: e.y - 60, txt: '연속 돌진!', t: 0 });
      }
    }
  } else if (e.type === 'glove') { // 소환 + 사방 탄막
    e.x += Math.cos(a) * e.spd * dt; e.y += Math.sin(a) * e.spd * dt;
    e.patT -= dt;
    if (e.patT <= 0) {
      e.patT = 8;
      for (let i = 0; i < 2; i++) {
        const sa = rand(0, TAU);
        spawnMinion('ticket', e.x + Math.cos(sa) * 50, e.y + Math.sin(sa) * 50);
      }
      for (let i = 0; i < 12; i++) {
        const sa = i * TAU / 12;
        G.eprojs.push({ x: e.x, y: e.y, vx: Math.cos(sa) * 220, vy: Math.sin(sa) * 220,
          dmg: e.dmg * 0.5, r: 8, life: 2.5, color: '#ff8c5d' });
      }
      G.floats.push({ x: e.x, y: e.y - 60, txt: '소환 + 탄막!', t: 0 });
      G.shake = Math.max(G.shake, 8);
    }
  } else { // umb: 점멸 강타 + 낙석
    e.x += Math.cos(a) * e.spd * dt; e.y += Math.sin(a) * e.spd * dt;
    e.patT -= dt;
    if (e.patT <= 0) {
      e.patT = 6;
      const ta = rand(0, TAU);
      e.x = p.x + Math.cos(ta) * 110; e.y = p.y + Math.sin(ta) * 110;
      G.parts.push({ kind: 'ring', x: e.x, y: e.y, t: 0, dur: 0.35, R: 110 });
      G.shake = Math.max(G.shake, 8);
      if (p.invuln <= 0 && dist2(e.x, e.y, p.x, p.y) < 110 * 110)
        hurtPlayer(14, angTo(e.x, e.y, p.x, p.y));
    }
    e.rockT = (e.rockT === undefined ? 4 : e.rockT) - dt;
    if (e.rockT <= 0) {
      e.rockT = rand(7, 10);
      for (let i = 0; i < 5; i++) {
        const sa = rand(0, TAU), sd = rand(60, 260);
        G.zones.push({ kind: 'rockwarn', x: p.x + Math.cos(sa) * sd, y: p.y + Math.sin(sa) * sd,
          r: 55, t: 1.2, dur: 1.2, tick: 99, pdmg: 22 });
      }
      G.floats.push({ x: e.x, y: e.y - 60, txt: '☄️ 낙석 주의!', t: 0 });
    }
  }
  if (p.invuln <= 0 && dist2(e.x, e.y, p.x, p.y) < (e.r + p.r - 4) * (e.r + p.r - 4))
    hurtPlayer(e.dmg, angTo(e.x, e.y, p.x, p.y));
}
function spawnBoss() {
  const p = G.player;
  const a = rand(0, TAU), d = Math.max(W, H) * 0.7;
  G.enemies.push({
    type: 'ticket', isBoss: true, elite: true, ename: 'THE LAST TRAIN',
    x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d,
    hp: 12000, maxHp: 12000, spd: 46 * SPD_MUL, dmg: 20, xp: 0, r: 70,
    vx: 0, vy: 0, flash: 0, slow: 0, frozen: 0, boneT: 0, dead: false,
    seed: rand(0, TAU), dashT: 0, dashing: 0, tele: 0,
    bstate: 'idle', bt: 3, chargeA: 0, summonT: 8, ringT: 6, ringR: 0, ringHit: false, phase: 1,
  });
  G.bossActive = true;
  setBanner('🚂 THE LAST TRAIN');
}
function updateBoss(e, dt) {
  const p = G.player;
  const spMul = e.slow > 0 ? 0.45 : 1;
  if (e.hp < e.maxHp * 0.5 && e.phase === 1) {
    e.phase = 2;
    setBanner('🚂 분노의 질주!');
    G.shake = Math.max(G.shake, 12);
    G.parts.push({ kind: 'ring', x: e.x, y: e.y, t: 0, dur: 0.6, R: 260 });
  }
  const a = angTo(e.x, e.y, p.x, p.y);
  if (e.bstate === 'idle') {
    e.x += Math.cos(a) * e.spd * spMul * dt; e.y += Math.sin(a) * e.spd * spMul * dt;
    e.bt -= dt;
    if (e.bt <= 0) { e.bstate = 'warn'; e.bt = 1.0; }
  } else if (e.bstate === 'warn') {
    e.chargeA = a; e.bt -= dt;
    if (e.bt <= 0) { e.bstate = 'charge'; e.bt = 0.9; G.shake = Math.max(G.shake, 9); }
  } else if (e.bstate === 'charge') {
    const sp = (e.phase === 2 ? 640 : 520) * spMul * SPD_MUL;
    e.x += Math.cos(e.chargeA) * sp * dt; e.y += Math.sin(e.chargeA) * sp * dt;
    e.bt -= dt;
    if (e.bt <= 0) { e.bstate = 'idle'; e.bt = e.phase === 2 ? 2 : 3; }
  }
  e.summonT -= dt;
  if (e.summonT <= 0) {
    e.summonT = e.phase === 2 ? 8 : 11;
    for (let i = 0; i < 3; i++) spawnMinion('ticket', e.x + rand(-60, 60), e.y + rand(-60, 60));
    G.shake = Math.max(G.shake, 4);
  }
  if (e.phase === 2) {
    e.ringT -= dt;
    if (e.ringT <= 0 && e.ringR <= 0) { e.ringT = 7; e.ringR = 1; e.ringHit = false; G.shake = Math.max(G.shake, 7); }
  }
  if (e.ringR > 0) {
    e.ringR += 320 * dt;
    if (!e.ringHit && p.invuln <= 0) {
      const d = Math.hypot(p.x - e.x, p.y - e.y);
      if (Math.abs(d - e.ringR) < 20) { e.ringHit = true; hurtPlayer(16, angTo(e.x, e.y, p.x, p.y)); }
    }
    if (e.ringR > 320) e.ringR = 0;
  }
  if (p.invuln <= 0 && dist2(e.x, e.y, p.x, p.y) < (e.r + p.r - 4) * (e.r + p.r - 4))
    hurtPlayer(e.dmg, angTo(e.x, e.y, p.x, p.y));
}

// ============ Enemies ============
function spawnEnemy(force) {
  if (G.enemies.length > 70) return;
  const t = G.time;
  const pool = ['ticket', 'ticket', 'ticket'];
  if (t > 25 || force === 'glove') pool.push('glove', 'glove');
  if (t > 45) pool.push('can', 'can');
  if (t > 70 || force === 'umb') pool.push('umb');
  if (t > 110) pool.push('paper');
  if (t > 150) pool.push('pack');
  const type = force || pool[randInt(0, pool.length - 1)];
  const base = ENEMY_TYPES[type];
  const hpMul = 1 + t / 200, dmgMul = 1 + t / 320;
  const a = rand(0, TAU), d = Math.max(W, H) * 0.62;
  G.enemies.push({
    type, x: G.player.x + Math.cos(a) * d, y: G.player.y + Math.sin(a) * d,
    hp: base.hp * hpMul, maxHp: base.hp * hpMul, spd: base.spd * rand(0.9, 1.1) * SPD_MUL,
    dmg: base.dmg * dmgMul, xp: base.xp, r: base.r,
    vx: 0, vy: 0, flash: 0, slow: 0, frozen: 0, boneT: 0, dead: false,
    seed: rand(0, TAU), dashT: rand(0, 2), dashing: 0, tele: 0,
  });
  const ne = G.enemies[G.enemies.length - 1];
  collideRocks(ne, ne.r); // 돌무더기 안에 스폰되면 밖으로
}
function damageEnemy(e, dmg, kx, ky) {
  if (e.dead) return;
  e.hp -= dmg; e.flash = 0.12;
  e.vx += kx * 0.02 * SPD_MUL; e.vy += ky * 0.02 * SPD_MUL;
  G.floats.push({ x: e.x, y: e.y - e.r - 6, txt: Math.round(dmg), t: 0 });
  if (e.hp <= 0) {
    e.dead = true; G.kills++;
    if (e.isBoss) { victory(); return; }
    // 신문 분열: 죽으면 작은 신문 4개로
    if (e.type === 'paper' && !e.elite) {
      for (let i = 0; i < 4; i++) {
        const sa = i * TAU / 4 + rand(-0.3, 0.3);
        spawnMinion('paperbit', e.x + Math.cos(sa) * 24, e.y + Math.sin(sa) * 24);
      }
      G.floats.push({ x: e.x, y: e.y - 30, txt: '📰 분열!', t: 0 });
    }
    if (e.elite) {
      for (let i = 0; i < 10; i++)
        G.gems.push({ x: e.x + rand(-20, 20), y: e.y + rand(-20, 20), vx: rand(-90, 90), vy: rand(-90, 90), v: 5 });
      dropKeepsake(e.x, e.y);
      G.bondTier = Math.min(2, G.bondTier + 1);
      setBanner('유대감 상승! Bond ' + ['I', 'II', 'III'][G.bondTier]);
    } else {
      G.gems.push({ x: e.x, y: e.y, vx: rand(-60, 60), vy: rand(-60, 60), v: e.xp });
      const dr = Math.random();
      if (dr < 0.025) spawnPickup(e.x, e.y, 'snack');
      else if (dr < 0.030) spawnPickup(e.x, e.y, 'magnet');
    }
    for (let i = 0; i < 8; i++)
      G.parts.push({ kind: 'poof', x: e.x, y: e.y, vx: rand(-140, 140), vy: rand(-140, 140), t: 0, dur: rand(0.3, 0.6) });
  }
}
function updateEnemies(dt) {
  const p = G.player;
  for (const e of G.enemies) {
    if (e.frozen > 0) {
      e.frozen -= dt;
      if (Math.random() < 6 * dt) // 서리 결정 파티클
        G.parts.push({ kind: 'frost', x: e.x + rand(-e.r, e.r), y: e.y + rand(-e.r, e.r),
          vx: rand(-20, 20), vy: rand(-45, -15), t: 0, dur: rand(0.4, 0.8) });
      continue;
    } // 시간 정지 중
    if (e.flash > 0) e.flash -= dt;
    if (e.slow > 0) e.slow -= dt;
    collideRocks(e, e.r); // 돌무더기 충돌
    if (e.isBoss) { updateBoss(e, dt); e.vx *= 0.86; e.vy *= 0.86; continue; }
    if (e.elite) { updateElite(e, dt * (e.slow > 0 ? 0.45 : 1)); e.vx *= 0.86; e.vy *= 0.86; continue; }
    const spMul = e.slow > 0 ? 0.45 : 1;
    const a = angTo(e.x, e.y, p.x, p.y);
    if (e.type === 'glove') { // 돌진 패턴      e.dashT -= dt;
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
    } else if (e.type === 'can') { // 독 장판 생성
      const wob = Math.sin(G.time * 3 + e.seed) * 0.25;
      const ma = a + wob * 0.4;
      e.x += (Math.cos(ma) * e.spd * spMul + e.vx) * dt;
      e.y += (Math.sin(ma) * e.spd * spMul + e.vy) * dt;
      e.puddleT = (e.puddleT === undefined ? rand(2, 4) : e.puddleT) - dt;
      if (e.puddleT <= 0) {
        e.puddleT = rand(4, 7);
        const blobs = [];
        for (let b = 0; b < 7; b++)
          blobs.push({ a: (b / 7) * TAU + rand(-0.35, 0.35), d: rand(0, 18), r: rand(26, 38) });
        G.zones.push({ kind: 'poison', x: e.x, y: e.y, r: 55, t: 5, dur: 5, tick: 0, pdmg: 9,
          seed: rand(0, 100), blobs });
        G.parts.push({ kind: 'poof', x: e.x, y: e.y, vx: 0, vy: -30, t: 0, dur: 0.5 });
      }
    } else if (e.type === 'umb') { // 원거리 사격
      const wob = Math.sin(G.time * 3 + e.seed) * 0.25;
      const ma = a + wob * 0.4;
      e.x += (Math.cos(ma) * e.spd * spMul + e.vx) * dt;
      e.y += (Math.sin(ma) * e.spd * spMul + e.vy) * dt;
      e.shotT = (e.shotT === undefined ? rand(1, 2) : e.shotT) - dt;
      if (e.shotT <= 0 && dist2(e.x, e.y, p.x, p.y) < 520 * 520) {
        e.shotT = rand(2.2, 3.4);
        const sa = angTo(e.x, e.y, p.x, p.y) + rand(-0.08, 0.08);
        G.eprojs.push({ x: e.x, y: e.y - 10, vx: Math.cos(sa) * 260, vy: Math.sin(sa) * 260,
          dmg: e.dmg * 0.8, r: 7, life: 2.2, color: '#b48cff' });
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
  // 분리 (겹침 해소, 보스는 제외)
  const es = G.enemies;
  for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++) {
    const a = es[i], b = es[j];
    if (a.isBoss || b.isBoss) continue;
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
function hurtPlayer(dmg, ang, noInvuln) {
  const p = G.player;
  if ((!noInvuln && p.invuln > 0) || p.rewinding) return;
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
  // 깨진 선글라스: 치명상 1회 무효 + 주변 적 밀쳐내기
  if (p.hp - dmg <= 0 && p.keepsakes.glasses && !p.keepsakes.glassesUsed) {
    p.keepsakes.glassesUsed = true; p.hp = 1; p.invuln = 1.5;
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (dist2(p.x, p.y, e.x, e.y) < 220 * 220) {
        const a2 = angTo(p.x, p.y, e.x, e.y);
        damageEnemy(e, 20 * atkMul(), Math.cos(a2) * 500, Math.sin(a2) * 500);
      }
    }
    G.shake = Math.max(G.shake, 10);
    G.floats.push({ x: p.x, y: p.y - 60, txt: '🕶️ 한 번은 봐준다!', t: 0, big: true });
    return;
  }
  p.hp -= dmg; if (!noInvuln) p.invuln = 0.6;
  p.x += Math.cos(ang) * 26; p.y += Math.sin(ang) * 26;
  p.gemStreak = 0; // 한쪽 이어버드 연속 획득 리셋
  G.shake = Math.max(G.shake, 6);
  G.floats.push({ x: p.x, y: p.y - 40, txt: '-' + Math.round(dmg), t: 0, hurt: true });
  if (p.hp > 0) {
    // 금간 손목시계: 피격 시 1초 시간 정지 (3회)
    if (p.keepsakes.watch && (p.keepsakes.watchN || 0) > 0) {
      p.keepsakes.watchN--;
      for (const e of G.enemies) {
        if (e.isBoss) e.slow = Math.max(e.slow, 1);
        else e.frozen = Math.max(e.frozen, 1);
      }
      G.floats.push({ x: p.x, y: p.y - 60, txt: '⏱ 시간 정지!', t: 0, big: true });
    }
    // 빈 우유곽: HP 30% 이하에서 30 회복 (1회)
    if (p.keepsakes.milk && !p.keepsakes.milkUsed && p.hp <= p.maxHp * 0.3) {
      p.keepsakes.milkUsed = true;
      p.hp = Math.min(p.maxHp, p.hp + 30);
      G.floats.push({ x: p.x, y: p.y - 60, txt: '🥛 우유 한 모금! +30', t: 0, big: true });
    }
  }
  if (p.hp <= 0) { p.hp = 0; gameOver(); }
}

// ============ Enemy Art (스프라이트) ============
function drawEnemy(e) {
  if (e.isBoss) { drawBoss(e); return; }
  const img = SPR[ENEMY_SPR[e.type]];
  ctx.save();
  ctx.translate(e.x, e.y);
  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(0, e.r * 0.9, e.r * 0.9, e.r * 0.3, 0, 0, TAU); ctx.fill();
  if (e.elite) { // Elite 붉은 링
    ctx.strokeStyle = e.warnT > 0 ? '#ff3b3b' : 'rgba(255,80,80,0.55)';
    ctx.lineWidth = e.warnT > 0 ? 5 : 3;
    ctx.beginPath(); ctx.ellipse(0, e.r * 0.7, e.r * 1.05, e.r * 0.4, 0, 0, TAU); ctx.stroke();
  }
  if (e.frozen > 0) ctx.globalAlpha = 0.7;
  if (e.elite) {
    const def = ELITE_DEFS[e.type], ed = def.dims;
    // 엘리트 걷기 애니메이션 (6프레임, 6fps)
    const [wkey, wasp] = def.walk[Math.floor(G.time * 6 + e.seed) % 6];
    const ww = Math.round(ed[1] * wasp);
    const espr = sprFor(wkey, ww, ed[1]);
    if (espr) ctx.drawImage(espr, -ww / 2, -ed[1] / 2, ww, ed[1]);
    else {
      const fspr = sprFor(def.spr, ed[0], ed[1]);
      if (fspr) ctx.drawImage(fspr, -ed[0] / 2, -ed[1] / 2, ed[0], ed[1]);
    }
  } else {
    // 걷기 애니메이션 (6프레임, 8fps) — paperbit는 paper 스프라이트 재사용
    const sprType = e.type === 'paperbit' ? 'paper' : e.type;
    const anim = ENEMY_ANIM[sprType], h = ENEMY_ANIM_H[e.type] || 52;
    const [fi, asp] = anim[Math.floor(G.time * 8 + e.seed) % 6];
    const w = Math.round(h * asp);
    const spr = sprFor(`enemy-${sprType}-walk-${fi}`, w, h);
    if (spr) ctx.drawImage(spr, -w / 2, -h / 2, w, h);
    else if (img && img.complete && img.naturalWidth) ctx.drawImage(img, -w / 2, -h / 2, w, h);
  }
  // 장갑 돌진 텔레그래프
  if (e.type === 'glove' && e.tele > 0) {
    ctx.globalAlpha = 0.22; ctx.fillStyle = '#ff3b3b';
    ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.fill();
    ctx.globalAlpha = e.frozen > 0 ? 0.7 : 1;
  }
  ctx.restore();
  if (e.elite) { // Elite 이름 + HP바
    ctx.textAlign = 'center'; ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#ff8080';
    ctx.fillText(e.ename, e.x, e.y - e.r - 22);
    const w = e.r * 2.4;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(e.x - w / 2, e.y - e.r - 16, w, 6);
    ctx.fillStyle = '#ff5d5d'; ctx.fillRect(e.x - w / 2, e.y - e.r - 16, w * Math.max(0, e.hp / e.maxHp), 6);
  }
  if (e.frozen > 0) { // 얼음 결정: 시안 글로우 + 서리 파티클
    const pulse = 0.6 + 0.4 * Math.sin(G.time * 10 + e.seed);
    ctx.globalAlpha = 0.25 * pulse;
    ctx.fillStyle = '#7dd8ff';
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 1.15, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = '#bfe9ff'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 1.12, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.45 * pulse;
    ctx.strokeStyle = '#7dd8ff'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 1.22, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
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
// ============ Boss: THE LAST TRAIN ============
function drawBoss(e) {
  const p = G.player, flash = e.flash > 0;
  const ang = e.bstate === 'charge' ? e.chargeA : angTo(e.x, e.y, p.x, p.y);
  // 돌진 텔레그래프
  if (e.bstate === 'warn') {
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.chargeA);
    ctx.globalAlpha = 0.16 + 0.1 * Math.sin(G.time * 20); ctx.fillStyle = '#ff3b3b';
    ctx.fillRect(0, -55, 1400, 110);
    ctx.restore(); ctx.globalAlpha = 1;
  }
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.ellipse(0, 62, 95, 20, 0, 0, TAU); ctx.fill();
  ctx.rotate(ang);
  const pulse = e.phase === 2 ? Math.sin(G.time * 10) * 0.015 : Math.sin(G.time * 4) * 0.008;
  ctx.scale(1 + pulse, 1 + pulse);
  const BW = 224, BH = 216; // 보스 걷기 애니메이션 (6프레임, 6fps)
  if (flash) ctx.globalAlpha = 0.72;
  const [bkey, basp] = BOSS_WALK[Math.floor(G.time * 6) % 6];
  const bw2 = Math.round(BH * basp);
  const bspr = sprFor(bkey, bw2, BH);
  if (bspr) ctx.drawImage(bspr, -bw2 / 2, -BH / 2 + 10, bw2, BH);
  else {
    const ospr = sprFor('enemy-boss-train', BW, BH);
    if (ospr) ctx.drawImage(ospr, -BW / 2, -BH / 2 + 10, BW, BH);
  }
  // Phase 2 붉은 기운
  if (e.phase === 2) {
    ctx.globalAlpha = 0.12 + 0.07 * Math.sin(G.time * 10);
    ctx.fillStyle = '#ff2222';
    ctx.beginPath(); ctx.arc(0, 10, 115, 0, TAU); ctx.fill();
  }
  ctx.restore();
  if (e.ringR > 0) {
    ctx.globalAlpha = 0.7; ctx.strokeStyle = '#ffd76d'; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.ringR, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'center'; ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = '#ffb84d';
  ctx.fillText('🚂 ' + e.ename, e.x, e.y - 100);
  const w = 220;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(e.x - w / 2, e.y - 92, w, 10);
  ctx.fillStyle = e.phase === 2 ? '#ff5d5d' : '#ffb84d';
  ctx.fillRect(e.x - w / 2, e.y - 92, w * Math.max(0, e.hp / e.maxHp), 10);
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
      ctx.globalAlpha = 0.25; ctx.fillStyle = '#7dd8ff';
      ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r * 1.9, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(125,216,255,0.9)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(pr.x, pr.y); ctx.lineTo(pr.x, pr.y - 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pr.x, pr.y); ctx.lineTo(pr.x + 5, pr.y + 2); ctx.stroke();
    } else if (pr.kind === 'ball' || pr.kind === 'homer' || pr.kind === 'rally') {
      const col = pr.kind === 'homer' ? '#ff9d5c' : pr.kind === 'rally' ? '#7dffd4' : '#d8ff5d';
      ctx.globalAlpha = 0.25; ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r * 1.9, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r - 3, 0.6, 2.4); ctx.stroke();
      if (pr.kind === 'homer') { // 야구공 실밥
        ctx.strokeStyle = '#d43d2a';
        ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r - 5, 2.2, 4.0); ctx.stroke();
      }
    } else if (pr.kind === 'boom' || pr.kind === 'zapboom') { // 부메랑: 빙글빙글 회전
      const zap = pr.kind === 'zapboom';
      ctx.globalAlpha = 0.22; ctx.fillStyle = zap ? '#ffe27d' : '#e8a34d';
      ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r * 1.8, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(pr.x, pr.y); ctx.rotate(G.time * 14);
      ctx.strokeStyle = zap ? '#ffe27d' : '#e8a34d'; ctx.lineWidth = 8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, 0, 10, 0.4, Math.PI - 0.4); ctx.stroke();
      ctx.strokeStyle = zap ? '#fff' : '#fff3d6'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 10, 0.7, Math.PI - 0.7); ctx.stroke();
      ctx.restore();
    } else if (pr.kind === 'wave2' || pr.kind === 'doom' || pr.kind === 'doommini') {
      const doom = pr.kind !== 'wave2';
      const col = doom ? '#c77dff' : '#7dd8ff';
      ctx.globalAlpha = 0.3; ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r * 2.1, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = col; ctx.lineWidth = doom ? 6 : 4;
      ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(pr.x, pr.y); ctx.lineTo(pr.x, pr.y - 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pr.x, pr.y); ctx.lineTo(pr.x + 5, pr.y + 2); ctx.stroke();
    } else if (pr.kind === 'star') {
      ctx.save(); ctx.translate(pr.x, pr.y);
      ctx.globalAlpha = 0.3; ctx.fillStyle = '#ffe27d';
      ctx.beginPath(); ctx.arc(0, 0, 20, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = '#ffe27d';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 11 : 5, a = i * Math.PI / 5 - Math.PI / 2;
        ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }
  // 뼈다귀 궤도
  const p = G.player;
  for (const bid of ['bone', 'satbone']) {
    const bw = p.weapons.find(w => w.id === bid);
    if (!bw) continue;
    const sat = bid === 'satbone';
    const n = sat ? 3 : 2 + Math.floor(bw.lvl / 3), R = sat ? 104 : 74;
    for (let i = 0; i < n; i++) {
      const a = bw.ang + i * TAU / n;
      drawBone(p.x + Math.cos(a) * R, p.y + Math.sin(a) * R, a + 0.6, sat ? 1.25 : 1);
    }
    if (sat) { // 위성 궤도 링
      ctx.globalAlpha = 0.2; ctx.strokeStyle = '#9adcff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}
function drawZones() {
  for (const z of G.zones) {
    const k = z.t / z.dur;
    if (z.kind === 'shield') {
      ctx.globalAlpha = 0.16 * Math.min(1, k * 3);
      ctx.fillStyle = '#7dd8ff';
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.5 * Math.min(1, k * 3);
      ctx.strokeStyle = '#bfe9ff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (z.kind === 'zap') {
      ctx.globalAlpha = 0.3 * k;
      ctx.fillStyle = '#ffe27d';
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r * (0.5 + 0.5 * k), 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (z.kind === 'poison') {
      // 보라색 독 물웅덩이: 울퉁불퉁한 웅덩이 + 올라오는 기포
      const fade = Math.min(1, k * 3);
      ctx.globalAlpha = 0.42 * fade;
      const g = ctx.createRadialGradient(z.x, z.y, 4, z.x, z.y, z.r);
      g.addColorStop(0, '#c084fc'); g.addColorStop(0.55, '#9333ea'); g.addColorStop(1, '#581c87');
      ctx.fillStyle = g;
      ctx.beginPath();
      for (const b of z.blobs) {
        const bx = z.x + Math.cos(b.a) * b.d, by = z.y + Math.sin(b.a) * b.d;
        ctx.moveTo(bx + b.r, by);
        ctx.arc(bx, by, b.r, 0, TAU);
      }
      ctx.fill();
      // 기포
      ctx.globalAlpha = 0.5 * fade;
      ctx.fillStyle = '#e9d5ff';
      for (let bi = 0; bi < 3; bi++) {
        const bt = (G.time * 0.45 + z.seed + bi * 0.37) % 1;
        const bx = z.x + Math.sin(z.seed * 9 + bi * 2.1) * z.r * 0.5;
        const by = z.y + (0.55 - bt) * z.r * 1.1;
        ctx.beginPath(); ctx.arc(bx, by, 4.5 * (1 - bt * 0.5), 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (z.kind === 'rockwarn') {
      const pulse = 0.5 + 0.5 * Math.sin(G.time * 12);
      ctx.globalAlpha = 0.25 + 0.2 * pulse;
      ctx.fillStyle = '#ff3b3b';
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
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
    } else if (pt.kind === 'frost') { // 서리 결정 파티클
      ctx.globalAlpha = 1 - k;
      const fx = pt.x + pt.vx * pt.t, fy = pt.y + pt.vy * pt.t, s = 5 * (1 - k * 0.5);
      ctx.strokeStyle = '#cfeeff'; ctx.lineWidth = 1.6;
      for (let a = 0; a < 3; a++) {
        const an = a * Math.PI / 3 + pt.t * 2;
        ctx.beginPath();
        ctx.moveTo(fx - Math.cos(an) * s, fy - Math.sin(an) * s);
        ctx.lineTo(fx + Math.cos(an) * s, fy + Math.sin(an) * s);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }
}
function drawGems() {
  for (const gm of G.gems) {
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#7dd8ff';
    ctx.beginPath(); ctx.arc(gm.x, gm.y, 12, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = '#9fe8ff';
    ctx.save(); ctx.translate(gm.x, gm.y); ctx.rotate(Math.PI / 4);
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
  // 애니메이션: 걷기 / idle
  const anim = CHAR_ANIM[G.char];
  let sprKey = G.char, sw = 76, sh = 76;
  if (anim) {
    sh = 72;
    const f = p.moving ? Math.floor(G.time * 10) % 6 : 2;
    let asp;
    [sprKey, asp] = anim.walk[f];
    sw = Math.round(sh * asp);
  }
  const pspr = sprFor(sprKey, sw, sh);
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.face, 1);
  if (pspr) ctx.drawImage(pspr, -sw / 2, -sh / 2, sw, sh);
  else { ctx.fillStyle = G.char === 'tobi' ? '#c98a4b' : '#e8e2f2'; ctx.beginPath(); ctx.arc(0, -6, 26, 0, TAU); ctx.fill(); }
  ctx.restore();
  // HP 바
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(p.x - 26, p.y - 52, 52, 5);
  ctx.fillStyle = '#5dff8a'; ctx.fillRect(p.x - 26, p.y - 52, 52 * clamp(p.hp / p.maxHp, 0, 1), 5);
}
function drawPartner() {
  const pt = G.partner;
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(pt.x, pt.y + 22, 16, 5, 0, 0, TAU); ctx.fill();
  const anim = CHAR_ANIM[pt.char];
  let sprKey = pt.char, sw = 52, sh = 52;
  if (anim) {
    sh = 62;
    let asp;
    if (G.player.moving) {
      const f = Math.floor(G.time * 10) % 6;
      [sprKey, asp] = anim.walk[f];
    } else [sprKey, asp] = anim.walk[2];
    sw = Math.round(sh * asp);
  }
  const pspr = sprFor(sprKey, sw, sh);
  ctx.save(); ctx.translate(pt.x, pt.y); ctx.scale(G.player.face, 1);
  if (pspr) ctx.drawImage(pspr, -sw / 2, -sh / 2, sw, sh);
  ctx.restore();
  ctx.globalAlpha = 1;
}

// ============ Gems / Partner ============
function updateGems(dt) {
  const p = G.player, mr = magR();
  for (let i = G.gems.length - 1; i >= 0; i--) {
    const gm = G.gems[i];
    gm.x += gm.vx * SPD_MUL * dt; gm.y += gm.vy * SPD_MUL * dt; gm.vx *= 0.9; gm.vy *= 0.9;
    const d2 = dist2(gm.x, gm.y, p.x, p.y);
    if (gm.mag || d2 < mr * mr) {
      const a = angTo(gm.x, gm.y, p.x, p.y), sp = 520 * SPD_MUL;
      gm.x += Math.cos(a) * sp * dt; gm.y += Math.sin(a) * sp * dt;
    }
    if (d2 < 26 * 26) {
      p.xp += gm.v; addBond(2.2);
      // 한쪽 이어버드: 젬 50개 연속 획득 시 음파 폭발
      if (p.keepsakes.earbud) {
        p.gemStreak = (p.gemStreak || 0) + 1;
        if (p.gemStreak >= 50) {
          p.gemStreak = 0;
          const dmg = 50 * atkMul();
          for (const e of G.enemies) {
            if (e.dead) continue;
            if (dist2(p.x, p.y, e.x, e.y) < 260 * 260) {
              const a = angTo(p.x, p.y, e.x, e.y);
              damageEnemy(e, dmg, Math.cos(a) * 300, Math.sin(a) * 300);
            }
          }
          G.parts.push({ kind: 'ring', x: p.x, y: p.y, t: 0, dur: 0.6, R: 300 });
          G.shake = Math.max(G.shake, 8);
          G.floats.push({ x: p.x, y: p.y - 60, txt: '🎧 음파 폭발!', t: 0, big: true });
        }
      }
      G.gems.splice(i, 1);
    }
  }
}
// ============ Pickups & Props (랜덤 이벤트) ============
const PROP_TYPES = {
  trash: { hp: 20, r: 20 },
  bench: { hp: 34, r: 30 },
};
function spawnPickup(x, y, kind) {
  if (G.pickups.length > 24) return;
  G.pickups.push({ kind, x, y, t: 0, life: 30, seed: rand(0, TAU) });
}
function spawnProp() {
  if (G.props.length >= 10) return;
  const a = rand(0, TAU), d = Math.max(W, H) * 0.55 + rand(0, 120);
  const kind = Math.random() < 0.6 ? 'trash' : 'bench';
  const base = PROP_TYPES[kind], hpMul = 1 + G.time / 300;
  G.props.push({
    kind, x: G.player.x + Math.cos(a) * d, y: G.player.y + Math.sin(a) * d,
    hp: base.hp * hpMul, maxHp: base.hp * hpMul, r: base.r,
    flash: 0, hitT: 0, dead: false, seed: rand(0, TAU),
  });
}
function breakProp(pr) {
  pr.dead = true;
  const n = randInt(2, 4);
  for (let i = 0; i < n; i++)
    G.gems.push({ x: pr.x + rand(-14, 14), y: pr.y + rand(-14, 14), vx: rand(-80, 80), vy: rand(-80, 80), v: randInt(1, 3) });
  const dr = Math.random();
  if (dr < 0.15) spawnPickup(pr.x, pr.y - 10, 'snack');
  else if (dr < 0.18) spawnPickup(pr.x, pr.y - 10, 'magnet');
  for (let i = 0; i < 10; i++)
    G.parts.push({ kind: 'poof', x: pr.x, y: pr.y, vx: rand(-160, 160), vy: rand(-160, 160), t: 0, dur: rand(0.3, 0.6) });
  G.floats.push({ x: pr.x, y: pr.y - 30, txt: '쾅!', t: 0 });
}
function damageProp(pr, dmg) {
  if (pr.dead || pr.hitT > 0) return;
  pr.hp -= dmg; pr.flash = 0.12; pr.hitT = 0.2;
  if (pr.hp <= 0) breakProp(pr);
}
function hurtProps(x, y, r, dmg) {
  for (const pr of G.props) {
    if (pr.dead) continue;
    if (dist2(x, y, pr.x, pr.y) < (r + pr.r) * (r + pr.r)) damageProp(pr, dmg);
  }
}
function applyPickup(pk) {
  const p = G.player, kind = pk.kind;
  if (kind === 'snack') {
    p.hp = Math.min(p.maxHp, p.hp + 25);
    G.floats.push({ x: p.x, y: p.y - 50, txt: '🍖 +25', t: 0, big: true });
  } else if (kind === 'magnet') {
    for (const gm of G.gems) gm.mag = true;
    G.floats.push({ x: p.x, y: p.y - 50, txt: '🧲 자석!', t: 0, big: true });
  } else if (kind === 'goldticket') {
    goldTicket();
  }
  for (let i = 0; i < 10; i++)
    G.parts.push({ kind: 'poof', x: p.x, y: p.y - 10, vx: rand(-120, 120), vy: rand(-120, 120), t: 0, dur: rand(0.3, 0.5) });
}
function goldTicket() {
  const p = G.player, roll = Math.random();
  if (roll < 0.3) {
    p.hp = Math.min(p.maxHp, p.hp + 35);
    G.floats.push({ x: p.x, y: p.y - 50, txt: '🎫 든든한 간식! HP+35', t: 0, big: true });
  } else if (roll < 0.55) {
    for (const gm of G.gems) gm.mag = true;
    G.floats.push({ x: p.x, y: p.y - 50, txt: '🎫 자석 파워!', t: 0, big: true });
  } else if (roll < 0.8) {
    p.maxHp += 10; p.hp = Math.min(p.maxHp, p.hp + 10);
    G.floats.push({ x: p.x, y: p.y - 50, txt: '🎫 튼튼해졌다! 최대HP+10', t: 0, big: true });
  } else {
    const ups = p.weapons.filter(w => w.lvl < WEAPONS[w.id].max);
    if (ups.length) {
      const w = ups[randInt(0, ups.length - 1)];
      w.lvl++;
      G.floats.push({ x: p.x, y: p.y - 50, txt: `🎫 ${WEAPONS[w.id].name} Lv${w.lvl}!`, t: 0, big: true });
      updateWeaponsBar();
    } else {
      p.hp = p.maxHp;
      G.floats.push({ x: p.x, y: p.y - 50, txt: '🎫 풀 회복!', t: 0, big: true });
    }
  }
}
function updatePickups(dt) {
  const p = G.player, mr = magR();
  G.propT -= dt;
  if (G.propT <= 0) { spawnProp(); G.propT = rand(4, 8); }
  G.ticketT -= dt;
  if (G.ticketT <= 0) {
    const a = rand(0, TAU), d = Math.max(W, H) * 0.45;
    spawnPickup(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 'goldticket');
    G.ticketT = rand(95, 130);
    G.floats.push({ x: p.x, y: p.y - 60, txt: '✨ 어딘가에 황금 티켓이...', t: 0 });
  }
  for (const pr of G.props) { if (pr.flash > 0) pr.flash -= dt; if (pr.hitT > 0) pr.hitT -= dt; }
  for (let i = G.props.length - 1; i >= 0; i--) if (G.props[i].dead) G.props.splice(i, 1);
  for (let i = G.pickups.length - 1; i >= 0; i--) {
    const pk = G.pickups[i]; pk.t += dt; pk.life -= dt;
    if (pk.life <= 0) { G.pickups.splice(i, 1); continue; }
    const d2 = dist2(pk.x, pk.y, p.x, p.y);
    if (d2 < mr * mr) {
      const a = angTo(pk.x, pk.y, p.x, p.y), sp = 420 * SPD_MUL;
      pk.x += Math.cos(a) * sp * dt; pk.y += Math.sin(a) * sp * dt;
    }
    if (d2 < 30 * 30) { applyPickup(pk); G.pickups.splice(i, 1); }
  }
}
function drawProps() {
  const tcSpr = sprFor('prop-trashcan', 46, 57);
  const bSpr = sprFor('prop-bench', 72, 60);
  for (const pr of G.props) {
    const flash = pr.flash > 0;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(pr.x, pr.y + pr.r * 0.7, pr.r * 0.8, pr.r * 0.25, 0, 0, TAU); ctx.fill();
    if (pr.kind === 'trash') {
      if (tcSpr) ctx.drawImage(tcSpr, pr.x - 23, pr.y - 50, 46, 57);
    } else {
      if (bSpr) ctx.drawImage(bSpr, pr.x - 36, pr.y - 48, 72, 60);
    }
    if (flash) { // 피격 플래시
      ctx.globalAlpha = 0.5; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(pr.x, pr.y - 12, pr.r + 4, pr.r * 1.2 + 4, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (pr.hp < pr.maxHp) {
      const w = pr.r * 1.6;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(pr.x - w / 2, pr.y - pr.r - 12, w, 4);
      ctx.fillStyle = '#ffb84d'; ctx.fillRect(pr.x - w / 2, pr.y - pr.r - 12, w * Math.max(0, pr.hp / pr.maxHp), 4);
    }
  }
}
function drawPickups() {
  for (const pk of G.pickups) {
    const bob = Math.sin(G.time * 4 + pk.seed) * 3;
    const blink = pk.life < 5 ? (Math.sin(pk.t * 12) > 0 ? 1 : 0.25) : 1;
    const halo = pk.kind === 'snack' ? '#ffb84d' : pk.kind === 'magnet' ? '#ff5d73' : '#ffd76d';
    ctx.globalAlpha = 0.25 * blink; ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(pk.x, pk.y + bob, 18, 0, TAU); ctx.fill();
    ctx.globalAlpha = blink;
    if (pk.kind === 'snack') {
      ctx.fillStyle = '#c98a4b';
      ctx.beginPath(); ctx.ellipse(pk.x, pk.y + bob, 11, 8, 0.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#efe8d8'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(pk.x + 7, pk.y + 5 + bob); ctx.lineTo(pk.x + 15, pk.y + 11 + bob); ctx.stroke();
      ctx.fillStyle = '#efe8d8';
      ctx.beginPath(); ctx.arc(pk.x + 16, pk.y + 12 + bob, 4, 0, TAU); ctx.fill();
    } else if (pk.kind === 'magnet') {
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#ff5d73'; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.arc(pk.x, pk.y + bob, 10, Math.PI * 0.75, Math.PI * 2.25); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.arc(pk.x, pk.y + bob, 10, Math.PI * 0.75, Math.PI * 1.02); ctx.stroke();
      ctx.beginPath(); ctx.arc(pk.x, pk.y + bob, 10, Math.PI * 1.98, Math.PI * 2.25); ctx.stroke();
    } else if (pk.kind === 'goldticket') {
      ctx.save(); ctx.translate(pk.x, pk.y + bob); ctx.rotate(Math.sin(pk.t * 2) * 0.15);
      ctx.fillStyle = '#ffd76d'; ctx.fillRect(-16, -10, 32, 20);
      ctx.fillStyle = '#c9962e';
      for (let px2 = -12; px2 <= 12; px2 += 6) { ctx.beginPath(); ctx.arc(px2, 0, 1.6, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#7a5a1a'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('★', 0, 4.5);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}

// 유대감 충전 (녹슨 호루라기: 2배속)
function addBond(n) {
  const p = G.player;
  G.partner.bond = Math.min(100, G.partner.bond + n * (p.keepsakes.whistle ? 2 : 1));
}
function updatePartner(dt) {
  const p = G.player, pt = G.partner;
  const tx = p.x - p.face * 52, ty = p.y + 26;
  pt.x += (tx - pt.x) * Math.min(1, 5 * dt);
  pt.y += (ty - pt.y) * Math.min(1, 5 * dt);
  collideRocks(pt, 16);
  addBond(1.1 * dt);
  // 녹슨 호루라기: 가득 차면 10초 안에 사용해야 함
  if (p.keepsakes.whistle && pt.bond >= 100) {
    p.whistleT = (p.whistleT === undefined ? 10 : p.whistleT) - dt;
    if (p.whistleT <= 0) {
      pt.bond = 0; p.whistleT = 10;
      G.floats.push({ x: p.x, y: p.y - 60, txt: '📯 신호가 식었다…', t: 0, big: true });
    }
  } else p.whistleT = 10;
  partnerBtn.classList.toggle('ready', pt.bond >= 100);
}
const partnerBtn = document.getElementById('partner-btn');
// ---- 일시정지 + 인벤토리 ----
const pauseBtn = document.getElementById('pause-btn');
const pauseScreen = document.getElementById('screen-pause');
function renderInventory() {
  const p = G.player;
  const w = p.weapons.map(x =>
    `<div class="inv-row"><span>${WEAPONS[x.id].icon} ${WEAPONS[x.id].name}</span><span>Lv ${x.lvl}</span></div>`).join('');
  const ps = Object.keys(p.passives).map(id =>
    `<div class="inv-row"><span>${PASSIVES[id].icon} ${PASSIVES[id].name}</span><span>Lv ${p.passives[id]}</span></div>`).join('');
  const ks = Object.keys(p.keepsakes).filter(id => KEEPSAKES[id]).map(id =>
    `<div class="inv-row"><span>${KEEPSAKES[id].icon} ${KEEPSAKES[id].name}</span><span class="inv-desc">${KEEPSAKES[id].desc}</span></div>`).join('');
  document.getElementById('pause-inv').innerHTML =
    `<h3>🔫 무기 (${p.weapons.length}/${MAX_WEAPONS})</h3>${w || '<p class="inv-empty">없음</p>'}` +
    `<h3>✨ 패시브 (${Object.keys(p.passives).length}/${MAX_PASSIVES})</h3>${ps || '<p class="inv-empty">없음</p>'}` +
    `<h3>❖ 유물</h3>${ks || '<p class="inv-empty">없음</p>'}`;
}
pauseBtn.addEventListener('click', () => {
  if (!G || G.state !== 'play') return;
  G.state = 'paused';
  renderInventory();
  pauseScreen.classList.remove('hidden');
});
document.getElementById('btn-resume').addEventListener('click', () => {
  pauseScreen.classList.add('hidden');
  if (G && G.state === 'paused') G.state = 'play';
});
document.getElementById('btn-quit').addEventListener('click', () => {
  pauseScreen.classList.add('hidden');
  document.getElementById('hud').classList.add('hidden');
  partnerBtn.classList.add('hidden');
  titleScreen.classList.remove('hidden');
  G = null;
});
partnerBtn.addEventListener('click', () => {
  if (!G || G.state !== 'play' || G.partner.bond < 100) return;
  G.partner.bond = 0;
  firePartnerSkill();
  // 오래된 사진: 30% 확률로 한 번 더
  if (G.player.keepsakes.photo && Math.random() < 0.3) {
    G.floats.push({ x: G.player.x, y: G.player.y - 80, txt: '📷 한 번 더!', t: 0, big: true });
    firePartnerSkill();
  }
  partnerBtn.classList.remove('ready');
});
function firePartnerSkill() {
  const p = G.player, tier = G.bondTier || 0;
  if (G.partner.char === 'tobi') {
    // 충격파: 주변 적 데미지 + 넉백 (Bond 단계별 강화)
    const R = [170, 200, 240][tier], sdmg = [30, 36, 44][tier] * atkMul();
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (dist2(p.x, p.y, e.x, e.y) < (R + e.r) * (R + e.r)) {
        const a = angTo(p.x, p.y, e.x, e.y);
        damageEnemy(e, sdmg, Math.cos(a) * 420, Math.sin(a) * 420);
      }
    }
    hurtProps(p.x, p.y, R, sdmg);
    G.parts.push({ kind: 'ring', x: p.x, y: p.y, t: 0, dur: 0.5, R: R + 40 });
    G.shake = Math.max(G.shake, 6);
    // 테니스공 (Bond 단계별 강화)
    const n = [14, 18, 22][tier], bdmg = [22, 26, 30][tier] * atkMul();
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n + rand(-0.1, 0.1);
      G.projs.push({ kind: 'ball', x: p.x, y: p.y, vx: Math.cos(a) * 460, vy: Math.sin(a) * 460,
        dmg: bdmg, bounce: 2, bounce0: 2, r: 12, life: 1.8 });
    }
    G.floats.push({ x: p.x, y: p.y - 50, txt: '신나게 물어와!', t: 0, big: true });
  } else {
    const fz = [3, 4.5, 6][tier];
    for (const e of G.enemies) {
      if (e.isBoss) e.slow = Math.max(e.slow, fz);
      else e.frozen = fz;
    }
    G.floats.push({ x: p.x, y: p.y - 50, txt: '잠깐 멈춰!', t: 0, big: true });
    G.parts.push({ kind: 'ring', x: p.x, y: p.y, t: 0, dur: 0.6, R: 300 });
  }
}

// ============ Level up ============
const lvScreen = document.getElementById('screen-levelup');
const lvChoices = document.getElementById('lv-choices');
const ksScreen = document.getElementById('screen-keepsake');
const ksChoices = document.getElementById('ks-choices');
const keepsakeBar = document.getElementById('keepsake-bar');
function updateKeepsakeBar() {
  const p = G.player;
  keepsakeBar.innerHTML = Object.keys(KEEPSAKES)
    .filter(k => p.keepsakes[k])
    .map(k => `<span title="${KEEPSAKES[k].name}">${KEEPSAKES[k].icon}</span>`).join('');
}
function openLevelUp() {
  G.state = 'levelup';
  const p = G.player, pool = [];
  const wCount = p.weapons.length, pCount = Object.keys(p.passives).length;
  for (const id in WEAPONS) {
    const w = p.weapons.find(w => w.id === id);
    if (!w && !WEAPONS[id].evo && wCount < MAX_WEAPONS) pool.push({ t: 'new', id });
    else if (w && w.lvl < WEAPONS[id].max) pool.push({ t: 'up', id }); // 진화 무기도 레벨업 가능
  }
  for (const id in PASSIVES) {
    const l = p.passives[id] || 0;
    if (l < PASSIVES[id].max && (l > 0 || pCount < MAX_PASSIVES)) pool.push({ t: 'passive', id });
  }
  // 진화에 소모된 무기는 슬롯이 가득 차도 다시 획득 가능
  for (const id of (p.consumed || [])) {
    if (!p.weapons.find(w => w.id === id)) pool.push({ t: 'new', id });
  }
  for (let i = pool.length - 1; i > 0; i--) { const j = randInt(0, i);[pool[i], pool[j]] = [pool[j], pool[i]]; }
  // 진화 후보는 확정 등장 (여러 개면 직접 고름)
  const nPicks = p.keepsakes.note ? 4 : 3; // 접힌 쪽지: 선택지 4개
  const picks = evoCandidates().map(id => ({ t: 'evo', id })).concat(pool).slice(0, nPicks);
  lvChoices.innerHTML = '';
  if (!picks.length) {
    lvChoices.innerHTML = `<button class="lv-choice" data-i="heal"><b>🍖 간식 타임</b><p>HP 30 회복</p></button>`;
  } else picks.forEach((c, i) => {
    let title, desc;
    if (c.t === 'new') { title = `${WEAPONS[c.id].icon} ${WEAPONS[c.id].name}`; desc = WEAPONS[c.id].desc + ' (신규!)' + evoHint(c.id); }
    else if (c.t === 'up') { const w = p.weapons.find(w => w.id === c.id); title = `${WEAPONS[c.id].icon} ${WEAPONS[c.id].name} <span class="new">Lv ${w.lvl} → ${w.lvl + 1}</span>`; desc = WEAPONS[c.id].desc + evoHint(c.id); }
    else if (c.t === 'evo') { title = `✨ ${WEAPONS[c.id].icon} ${WEAPONS[c.id].name}`; desc = WEAPONS[c.id].desc + ' <span class="new">진화!</span>'; }
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
  if (c.t === 'new') {
    p.weapons.push({ id: c.id, lvl: 1, t: 0.3, ang: rand(0, TAU) });
    if (p.consumed) p.consumed = p.consumed.filter(id => id !== c.id);
  }
  else if (c.t === 'up') p.weapons.find(w => w.id === c.id).lvl++;
  else if (c.t === 'passive') {
    p.passives[c.id] = (p.passives[c.id] || 0) + 1;
    if (c.id === 'paw') { p.maxHp += 10; p.hp = Math.min(p.maxHp, p.hp + 10); }
  }
  else if (c.t === 'heal') p.hp = Math.min(p.maxHp, p.hp + 30);
  else if (c.t === 'evo') { // 진화: 재료 무기 제거 → 진화 무기 Lv1 장착 (다시 강화)
    const consumed = EVOS[c.id].needs.weapons || [EVOS[c.id].needs.weapon];
    p.weapons = p.weapons.filter(w => !consumed.includes(w.id));
    for (const id of consumed) if (!p.consumed.includes(id)) p.consumed.push(id);
    p.weapons.push({ id: c.id, lvl: 1, t: 0.3, ang: rand(0, TAU) });
    setBanner(`✨ ${WEAPONS[c.id].name} 진화!`);
  }
  lvScreen.classList.add('hidden');
  G.state = 'play';
  updateWeaponsBar();
}

// ============ HUD ============
const hpBar = document.getElementById('hp-bar'), hpText = document.getElementById('hp-text');
const xpBar = document.getElementById('xp-bar'), timerEl = document.getElementById('timer');
const killsEl = document.getElementById('kills'), levelEl = document.getElementById('level');
const weaponsBar = document.getElementById('weapons-bar');
const bondLabel = document.getElementById('bond-label');
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
  if (bondLabel) bondLabel.textContent = '유대감 ' + ['I', 'II', 'III'][G.bondTier || 0];
}
function updateWeaponsBar() {
  const p = G.player;
  weaponsBar.innerHTML = p.weapons.map(w => {
    // 진화 가능하면 ✨ 표시
    let evoMark = '';
    const mats = EVO_OF[w.id];
    if (mats && w.lvl >= WEAPONS[w.id].max) {
      const ready = mats.some(({ evo, passive }) =>
        !p.weapons.find(x => x.id === evo) && (!passive || (p.passives[passive] || 0) > 0));
      if (ready) evoMark = '<sup style="font-size:10px">✨</sup>';
    }
    return `<span title="${WEAPONS[w.id].name} Lv${w.lvl}">${WEAPONS[w.id].icon}<sup style="font-size:10px">${w.lvl}</sup>${evoMark}</span>`;
  }).join('');
}

// ============ Main update / render ============
function update(dt) {
  const p = G.player;
  G.time += dt;
  // 이동
  const iv = inputVec();
  const sp = p.speed * spdMul() * SPD_MUL;
  p.x += iv.x * sp * dt; p.y += iv.y * sp * dt;
  collideRocks(p, p.r); // 돌무더기 충돌
  if (iv.x !== 0) p.face = iv.x > 0 ? 1 : -1;
  p.moving = !!(iv.x || iv.y);
  // 짝 잃은 양말: 가만히 있다 움직이면 2초간 가속
  if (p.keepsakes.sock) {
    if (p.moving && !p.wasMoving) p.sockT = 2;
    if (p.sockT > 0) p.sockT -= dt;
  }
  p.wasMoving = p.moving;
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
  // 타임라인 (Elite & Boss)
  if (!G.elite1 && G.time >= 180) { G.elite1 = true; spawnElite('ticket'); }
  if (!G.elite2 && G.time >= 360) { G.elite2 = true; spawnElite('glove'); }
  if (!G.elite3 && G.time >= 540) { G.elite3 = true; spawnElite('umb'); }
  if (!G.bossSpawned && G.time >= 600) { G.bossSpawned = true; spawnBoss(); }
  if (!G.warn1 && G.time >= 170) { G.warn1 = true; setBanner('⚠ Elite 접근 중…'); }
  if (!G.warn2 && G.time >= 350) { G.warn2 = true; setBanner('⚠ Elite 접근 중…'); }
  if (!G.warn3 && G.time >= 530) { G.warn3 = true; setBanner('⚠ Elite 접근 중…'); }
  if (!G.warnBoss && G.time >= 590) { G.warnBoss = true; setBanner('🚂 THE LAST TRAIN 접근 중…'); }
  // 따뜻한 목도리: 둘러싸이면 3초 방어막 (쿨 30초)
  if (p.keepsakes.scarf) {
    p.scarfCd = Math.max(0, (p.scarfCd || 0) - dt);
    if (p.scarfCd <= 0 && p.invuln <= 0) {
      let cnt = 0;
      for (const e of G.enemies) {
        if (!e.dead && dist2(e.x, e.y, p.x, p.y) < 130 * 130 && ++cnt >= 6) break;
      }
      if (cnt >= 6) {
        p.scarfCd = 30; p.invuln = 3;
        G.floats.push({ x: p.x, y: p.y - 50, txt: '🧣 목도리의 온기!', t: 0, big: true });
      }
    }
  }
  updateWeapons(dt); updateProjs(dt); updateEprojs(dt); updateZones(dt); updateEnemies(dt); updateGems(dt); updatePartner(dt); updatePickups(dt);
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
  // 1) 화면 전체 배경 (스크린 좌표계 — 매 프레임 전체 클리어)
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#141126'); g.addColorStop(0.6, '#0e0c1c'); g.addColorStop(1, '#0a0916');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // 2) 월드 (카메라)
  const px = G ? G.player.x : 0, py = G ? G.player.y : 0;
  const cx = px - W / 2, cy = py - H / 2;
  ctx.save(); ctx.translate(-cx, -cy);
  drawBG(cx, cy);
  if (G) {
    drawGems();
    drawPickups();
    drawProps();
    drawTrashLayer(cx, cy);
    // y-정렬: 돌무더기 + 적 + 파트너 + 플레이어 (뒤로 가면 가려짐)
    const draws = [];
    eachRockNear(cx + W / 2, cy + H / 2, Math.max(W, H) / 2 + 320, (pl) => {
      if (pl.x > cx - 80 && pl.x < cx + W + 80 && pl.y > cy - 300 && pl.y < cy + H + 80)
        draws.push({ y: pl.y, f: () => drawRock(pl) });
    });
    for (const e of G.enemies) draws.push({ y: e.y, f: () => drawEnemy(e) });
    draws.push({ y: G.partner.y, f: drawPartner });
    draws.push({ y: G.player.y, f: drawPlayer });
    draws.sort((a, b) => a.y - b.y);
    for (const d of draws) d.f();
    drawProjs(); drawEprojs(); drawZones();
    drawParts(1 / 60); drawFloats(1 / 60);
  }
  ctx.restore();

  // 3) 비네팅 (스크린 좌표계)
  const v = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.35, W/2, H/2, Math.max(W,H)*0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  // 형광등 깜빡임 (은은하게)
  if (G && G.state === 'play') {
    const fl = Math.sin(G.time * 11.3) * Math.sin(G.time * 5.7 + 1.3) * Math.sin(G.time * 2.9 + 4.1);
    if (fl > 0.86) { ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(0, 0, W, H); }
    else if (fl < -0.94) { ctx.fillStyle = 'rgba(0,0,0,0.10)'; ctx.fillRect(0, 0, W, H); }
  }
  if (G) {
    // 보스 HP바
    if (G.bossActive) {
      const boss = G.enemies.find(e => e.isBoss && !e.dead);
      if (boss) {
        ctx.textAlign = 'center'; ctx.font = 'bold 14px sans-serif';
        ctx.fillStyle = '#ffb84d'; ctx.fillText('🚂 THE LAST TRAIN', W / 2, 34);
        const bw2 = Math.min(420, W - 60);
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(W / 2 - bw2 / 2, 42, bw2, 10);
        ctx.fillStyle = boss.phase === 2 ? '#ff5d5d' : '#ffb84d';
        ctx.fillRect(W / 2 - bw2 / 2, 42, bw2 * Math.max(0, boss.hp / boss.maxHp), 10);
      }
    }
    // 배너
    if (G.banner) {
      const b = G.banner; b.t += 1 / 60;
      if (b.t > 2.6) G.banner = null;
      else {
        ctx.globalAlpha = b.t < 0.2 ? b.t / 0.2 : b.t > 2.2 ? (2.6 - b.t) / 0.4 : 1;
        ctx.textAlign = 'center'; ctx.font = 'bold 30px sans-serif';
        ctx.fillStyle = '#ffd76d';
        ctx.fillText(b.txt, W / 2, H * 0.32);
        ctx.globalAlpha = 1;
      }
    }
  }
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
const startksScreen = document.getElementById('screen-startks');
const startksGrid = document.getElementById('startks-grid');
let pendingChar = null;
document.querySelectorAll('.char-card').forEach(b => {
  b.addEventListener('click', () => {
    pendingChar = b.dataset.char;
    // 시작 유물 선택 화면
    startksGrid.innerHTML = '';
    for (const kid in KEEPSAKES) {
      const K = KEEPSAKES[kid];
      const c = document.createElement('button');
      c.className = 'startks-card';
      c.innerHTML = `<b>${K.icon} ${K.name}</b><p>${K.desc}</p>`;
      c.addEventListener('click', () => {
        startksScreen.classList.add('hidden');
        startGame(pendingChar, [kid]);
      });
      startksGrid.appendChild(c);
    }
    titleScreen.classList.add('hidden');
    startksScreen.classList.remove('hidden');
  });
});
function startGame(charId, startKs) {
  newGame(charId, startKs);
  titleScreen.classList.add('hidden');
  startksScreen.classList.add('hidden');
  overScreen.classList.add('hidden');
  document.getElementById('screen-clear').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  document.getElementById('bond-wrap').classList.remove('hidden');
  partnerBtn.classList.remove('hidden');
  updateWeaponsBar();
  updateKeepsakeBar();
}
function victory() {
  G.state = 'clear'; G.bossActive = false;
  const m = Math.floor(G.time / 60), s = Math.floor(G.time % 60);
  document.getElementById('clear-stats').innerHTML =
    `생존 시간 <b>${m}:${String(s).padStart(2, '0')}</b><br>처치 <b>${G.kills}</b> · 레벨 <b>${G.player.lvl}</b> · Keepsake <b>${Object.keys(G.player.keepsakes).length}</b>`;
  document.getElementById('screen-clear').classList.remove('hidden');
  partnerBtn.classList.add('hidden');
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
document.getElementById('btn-clear-retry').addEventListener('click', () => {
  document.getElementById('screen-clear').classList.add('hidden');
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
